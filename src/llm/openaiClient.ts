import OpenAI from 'openai';

export type StreamEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_call_delta'; toolCall: { index: number; id?: string; name?: string; arguments?: string } }
  | { type: 'done' };

export class OpenAIClient {
  private openai: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
  }

  async *chatStream(params: {
    messages: any[];
    tools?: any[];
    model: string;
    temperature: number;
    maxTokens: number;
  }): AsyncGenerator<StreamEvent> {
    try {
      const mappedMessages = params.messages.map((m) => {
        const out: any = { role: m.role, content: m.content || null };
        if (m.name) out.name = m.name;
        if (m.toolCallId) out.tool_call_id = m.toolCallId;
        if (m.toolCalls && m.toolCalls.length > 0) {
          out.tool_calls = m.toolCalls.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments)
            }
          }));
        }
        return out;
      });

      const stream = await this.openai.chat.completions.create({
        model: params.model,
        messages: mappedMessages,
        tools: params.tools?.length ? params.tools : undefined,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        if (choice.delta.content) {
          yield {
            type: 'text_delta',
            content: choice.delta.content,
          };
        }

        if (choice.delta.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            yield {
              type: 'tool_call_delta',
              toolCall: {
                index: tc.index,
                id: tc.id,
                name: tc.function?.name,
                arguments: tc.function?.arguments,
              },
            };
          }
        }
      }
      yield { type: 'done' };
    } catch (error: any) {
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }
}
