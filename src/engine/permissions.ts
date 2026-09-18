import { type Tool } from '../tools/tool.js';

export type PermissionLevel = 'allow' | 'ask' | 'deny';

export class PermissionEvaluator {
  private static SAFE_PREFIXES = [
    'ls', 'cat', 'head', 'tail', 'wc', 'pwd', 'whoami', 'echo',
    'git status', 'git log', 'git diff', 'git branch', 'git show',
    'grep', 'find', 'which', 'type', 'file', 'stat', 'date', 'uname',
    'node --version', 'npm --version', 'python --version',
  ];

  private static DANGEROUS_PATTERNS = [
    'rm -rf', 'rm -r', 'rmdir', 'mkfs', 'dd if=',
    'chmod 777', ':(){', '> /dev/', 'sudo ', 'su ',
  ];

  evaluateBash(command: string): PermissionLevel {
    const trimmed = command.trim();
    for (const pattern of PermissionEvaluator.DANGEROUS_PATTERNS) {
      if (trimmed.includes(pattern)) {
        return 'deny';
      }
    }
    for (const prefix of PermissionEvaluator.SAFE_PREFIXES) {
      if (trimmed.startsWith(prefix)) {
        return 'allow';
      }
    }
    return 'ask';
  }

  evaluateTool(tool: Tool, args: Record<string, unknown>): PermissionLevel {
    if (tool.name === 'execute_bash' || tool.name === 'bash') {
      const command = (args.command || args.code) as string;
      if (typeof command === 'string') {
        return this.evaluateBash(command);
      }
      return 'ask';
    }
    if (tool.name === 'write_file' || tool.name === 'edit_file') {
      return 'ask';
    }
    return 'allow';
  }
}
