# de-agent

A terminal-based AI Coding Agent inspired by Claude Code. Built with TypeScript, designed to assist you in your local development environment.

## Features

- **ReAct Agent Loop**: Automatically reasons, calls tools, observes results, and iterates until the task is complete.
- **7 Built-in Tools**: Read/write/edit files, run shell commands, grep regex, glob search, and list directories.
- **Multi-Model Support**: Compatible with OpenAI-style APIs, allowing you to use Claude, DeepSeek, GPT-4o, or local Ollama models.
- **Secure Execution**: Safe read-only commands run automatically, while dangerous operations (like `rm -rf`) require explicit user confirmation.
- **Streaming Output**: Real-time markdown rendering and tool execution UI directly in your terminal.
- **Dynamic System Prompt**: Automatically injects Git status, current working directory, OS info, and project memory (`.de-agent.md`).

## Installation

You can install `de-agent` globally via npm:

```bash
npm install -g de-agent
```

Or run it directly using `npx`:

```bash
npx de-agent
```

## Setup

Before using `de-agent`, you need to provide an API key. By default, it expects an OpenAI-compatible API.

```bash
export DE_AGENT_API_KEY="your-api-key"
```

### Custom Model & Base URL (Optional)

If you want to use a different model or provider (e.g., DeepSeek, Claude via proxy, or Ollama):

```bash
export DE_AGENT_MODEL_NAME="deepseek-chat"
export DE_AGENT_BASE_URL="https://api.deepseek.com/v1"
```

You can also create a config file at `~/.de-agent/config.json`:

```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://api.deepseek.com/v1",
  "modelName": "deepseek-chat",
  "permissionMode": "ask"
}
```

## Usage

### Interactive REPL Mode

Launch the interactive prompt to chat and collaborate with the agent:

```bash
de-agent
```

### One-Shot Task Mode

Pass a prompt directly to execute a specific task and exit:

```bash
de-agent "Create a new Express.js hello world server in the current directory"
```

### CLI Options

- `--api-key <key>`: Override the API key.
- `--base-url <url>`: Override the API base URL.
- `--model, -m <model>`: Specify the model name to use.
- `--auto-approve`: Automatically approve all tool calls (use with caution!).
- `--help`: Show help information.

## Project Memory

If you create a `.de-agent.md` file in the root of your project, the agent will automatically read it and include its contents in its system prompt. This is useful for providing project-specific instructions, coding guidelines, or architectural context.

## License

MIT
