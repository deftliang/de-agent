#!/usr/bin/env node

import { loadConfig } from './config.js';
import { ToolRegistry } from './tools/tool.js';
import { PermissionEvaluator } from './engine/permissions.js';
import { OpenAIClient } from './llm/openaiClient.js';
import { Display } from './ui/display.js';
import { Input } from './ui/input.js';
import { QueryEngine } from './engine/queryEngine.js';
import { fileReadTool } from './tools/fileReadTool.js';
import { fileWriteTool } from './tools/fileWriteTool.js';
import { fileEditTool } from './tools/fileEditTool.js';
import { globTool } from './tools/globTool.js';
import { grepTool } from './tools/grepTool.js';
import { bashTool } from './tools/bashTool.js';
import { listDirTool } from './tools/listDirTool.js';
async function main() {
  const args = process.argv.slice(2);
  let prompt: string | undefined;
  
  const cliOverrides: any = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: de-agent [options] [prompt]

Options:
  --api-key <key>      Set OpenAI/API key
  --base-url <url>     Set API base URL
  --model, -m <model>  Specify the model to use
  --auto-approve       Skip confirmation for all tool executions
  --help, -h           Show this help message

Examples:
  de-agent                         Launch interactive REPL mode
  de-agent "create a react app"    Run a one-shot task
      `);
      process.exit(0);
    } else if (arg === '--model' || arg === '-m') {
      cliOverrides.model = args[++i];
    } else if (arg === '--api-key') {
      cliOverrides.apiKey = args[++i];
    } else if (arg === '--base-url') {
      cliOverrides.baseUrl = args[++i];
    } else if (arg === '--auto-approve') {
      cliOverrides.autoApprove = true;
    } else if (!arg.startsWith('-')) {
      prompt = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  const config = await loadConfig();
  const finalConfig = { ...config, ...cliOverrides };

  if (!finalConfig.apiKey) {
    console.error('Error: API key is required. Set DE_AGENT_API_KEY environment variable or pass --api-key.');
    process.exit(1);
  }

  const llmClient = new OpenAIClient(finalConfig.apiKey, finalConfig.baseUrl);
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(fileReadTool);
  toolRegistry.register(fileWriteTool);
  toolRegistry.register(fileEditTool);
  toolRegistry.register(globTool);
  toolRegistry.register(grepTool);
  toolRegistry.register(bashTool);
  toolRegistry.register(listDirTool);
  const permissionEvaluator = new PermissionEvaluator();
  const display = new Display();
  
  const queryEngine = new QueryEngine(
    finalConfig,
    llmClient,
    toolRegistry,
    permissionEvaluator,
    display
  );

  display.printWelcome();

  if (prompt) {
    display.printUserMessage(prompt);
    try {
      await queryEngine.run(prompt);
    } catch (e: any) {
      display.printError(e.message);
    }
  } else {
    const input = new Input();
    while (true) {
      const userMessage = await input.getInput();
      if (userMessage === null) {
        break;
      }
      try {
        await queryEngine.run(userMessage);
      } catch (e: any) {
        display.printError(e.message);
      }
    }
    input.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
