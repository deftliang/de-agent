import { type AgentConfig } from '../config.js';
import { type Message, type ToolCall, ConversationHistory } from '../types.js';
import { type ToolRegistry } from '../tools/tool.js';
import { PermissionEvaluator } from './permissions.js';
import { OpenAIClient, type StreamEvent } from '../llm/openaiClient.js';
import { Display } from '../ui/display.js';
import { buildSystemPrompt } from './systemPrompt.js';

export class QueryEngine {
  private config: AgentConfig;
  private llmClient: OpenAIClient;
  private toolRegistry: ToolRegistry;
  private permissionEvaluator: PermissionEvaluator;
  private display: Display;
  private history: ConversationHistory;
  
  constructor(
    config: AgentConfig,
    llmClient: OpenAIClient,
    toolRegistry: ToolRegistry,
    permissionEvaluator: PermissionEvaluator,
    display: Display
  ) {
    this.config = config;
    this.llmClient = llmClient;
    this.toolRegistry = toolRegistry;
    this.permissionEvaluator = permissionEvaluator;
    this.display = display;
    this.history = new ConversationHistory();
    const toolNames = toolRegistry.getAll().map(t => t.name);
    this.history.addMessage({ role: 'system', content: buildSystemPrompt(process.cwd(), toolNames) });
  }

  async run(userMessage: string): Promise<string> {
    this.history.addMessage({ role: 'user', content: userMessage });
    
    let iterations = 0;
    const maxIterations = this.config.maxIterations || 10;
    
    while (iterations < maxIterations) {
      iterations++;
      
      this.history.truncateToFit(this.config.maxContextTokens || 128000);
      
      const messages = this.history.getMessages();
      const tools = this.toolRegistry.getAllSchemas();

      const stream = this.llmClient.chatStream({
        messages,
        tools,
        model: this.config.modelName,
        temperature: this.config.temperature || 0,
        maxTokens: this.config.maxTokens || 4096,
      });

      let fullText = '';
      const toolCallsMap = new Map<number, { id: string, name: string, arguments: string }>();

      for await (const chunk of stream) {
        if (chunk.type === 'text_delta') {
          fullText += chunk.content;
          this.display.streamText(chunk.content);
        } else if (chunk.type === 'tool_call_delta') {
          const tc = chunk.toolCall;
          if (!toolCallsMap.has(tc.index)) {
            toolCallsMap.set(tc.index, { id: tc.id || '', name: tc.name || '', arguments: tc.arguments || '' });
          } else {
            const existing = toolCallsMap.get(tc.index)!;
            if (tc.id) existing.id = tc.id;
            if (tc.name) existing.name += tc.name;
            if (tc.arguments) existing.arguments += tc.arguments;
          }
        } else if (chunk.type === 'done') {
          if (fullText) this.display.endStream();
        }
      }

      if (toolCallsMap.size === 0) {
        // Fallback for DeepSeek models that output raw DSML instead of standard tool calls
        const dsmlMatch = fullText.match(/<｜｜DSML｜｜ calls>([\s\S]*?)<\/｜｜DSML｜｜ calls>/);
        if (dsmlMatch) {
          const invokeRegex = /<｜｜DSML｜｜ invoke name="([^"]+)">([\s\S]*?)<\/｜｜DSML｜｜ invoke>/g;
          let match;
          let index = 0;
          while ((match = invokeRegex.exec(dsmlMatch[1])) !== null) {
            const toolName = match[1];
            const paramsBlock = match[2];
            const paramRegex = /<｜｜DSML｜｜ parameter name="([^"]+)"(?:[^>]*)>([\s\S]*?)<\/｜｜DSML｜｜ parameter>/g;
            const args: Record<string, string> = {};
            let pMatch;
            while ((pMatch = paramRegex.exec(paramsBlock)) !== null) {
              args[pMatch[1]] = pMatch[2];
            }
            // Map common name mismatches
            let mappedName = toolName;
            if (toolName.toLowerCase() === 'bash' || toolName === 'run_command') mappedName = 'bash';
            
            toolCallsMap.set(index, {
              id: `call_dsml_${Date.now()}_${index}`,
              name: mappedName,
              arguments: JSON.stringify(args)
            });
            index++;
          }
        }
      }

      if (toolCallsMap.size === 0) {
        this.history.addMessage({ role: 'assistant', content: fullText });
        return fullText;
      }

      const toolCallsList: ToolCall[] = [];
      for (const tc of toolCallsMap.values()) {
        let args: Record<string, unknown> = {};
        try {
          args = tc.arguments ? JSON.parse(tc.arguments) : {};
        } catch (e) {
          // ignore parsing errors here, fail below during tool execution validation
        }
        toolCallsList.push({
          id: tc.id,
          name: tc.name,
          arguments: args
        });
      }

      this.history.addMessage({ role: 'assistant', content: fullText || undefined, toolCalls: toolCallsList });

      for (const tc of toolCallsList) {
        const tool = this.toolRegistry.get(tc.name);
        if (!tool) {
          const errRes: Message = { role: 'tool', toolCallId: tc.id, name: tc.name, content: `Tool not found: ${tc.name}` };
          this.history.addMessage(errRes);
          this.display.printToolResult(tc.name, errRes.content!, true);
          continue;
        }

        this.display.printToolUse(tc.name, tc.arguments);

        const perm = this.permissionEvaluator.evaluateTool(tool, tc.arguments);
        if (perm === 'deny') {
          const errRes: Message = { role: 'tool', toolCallId: tc.id, name: tc.name, content: `Execution denied by safety policy.` };
          this.history.addMessage(errRes);
          this.display.printToolResult(tc.name, errRes.content!, true);
          continue;
        } else if (perm === 'ask' && this.config.permissionMode !== 'auto') {
          const desc = JSON.stringify(tc.arguments, null, 2);
          const approved = await this.display.askPermission(tc.name, desc);
          if (!approved) {
            const errRes: Message = { role: 'tool', toolCallId: tc.id, name: tc.name, content: `Execution cancelled by user.` };
            this.history.addMessage(errRes);
            this.display.printToolResult(tc.name, errRes.content!, true);
            continue;
          }
        }

        try {
          const result = await tool.execute(tc.arguments);
          const resMsg: Message = { role: 'tool', toolCallId: tc.id, name: tc.name, content: String(result) };
          this.history.addMessage(resMsg);
          this.display.printToolResult(tc.name, resMsg.content!, false);
        } catch (error: any) {
          const errRes: Message = { role: 'tool', toolCallId: tc.id, name: tc.name, content: `Tool execution failed: ${error.message}` };
          this.history.addMessage(errRes);
          this.display.printToolResult(tc.name, errRes.content!, true);
        }
      }
    }
    
    throw new Error('Max iterations reached.');
  }
}
