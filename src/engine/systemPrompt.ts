import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as os from 'os';

export function buildSystemPrompt(cwd: string, toolNames: string[] = []): string {
  let gitInfo = 'Git repository not found or git command failed.';
  try {
    const execOpts = { cwd, encoding: 'utf-8' as const, stdio: ['pipe', 'pipe', 'ignore'] as ['pipe', 'pipe', 'ignore'] };
    const branch = execSync('git branch --show-current', execOpts).trim();
    const status = execSync('git status --short', execOpts).trim();
    const lastCommits = execSync('git log -n 5 --oneline', execOpts).trim();
    
    gitInfo = `Git Branch: ${branch}\nGit Status:\n${status || 'Clean'}\nLast 5 Commits:\n${lastCommits}`;
  } catch (e) {
    // ignore
  }

  const memoryFile = join(cwd, '.de-agent.md');
  let projectMemory = '';
  if (existsSync(memoryFile)) {
    try {
      projectMemory = readFileSync(memoryFile, 'utf-8');
    } catch (e) {
      projectMemory = 'Failed to read .de-agent.md';
    }
  }

  const dateStr = new Date().toISOString();
  
  return `You are de-agent, an expert AI programming assistant and autonomous agent.
Your goal is to help the user with programming tasks by writing code, executing commands, and interacting with the system.

Environment Information:
- Current Working Directory: ${cwd}
- OS: ${os.platform()} ${os.release()}
- Date/Time: ${dateStr}

Version Control:
${gitInfo}

Project Memory (.de-agent.md):
${projectMemory || 'None'}

Available Tools:
You have access to the following tools: ${toolNames.join(', ')}.
Always use the EXACT tool name. For example, if you want to run a command, use "bash". If you want to list a directory, use "list_dir".

Behavioral Rules:
1. Be concise. Do not explain unnecessarily unless asked.
2. Use tools to accomplish tasks.
3. Validate output of commands.
4. If something fails, attempt to fix it or explain the issue clearly.
`;
}
