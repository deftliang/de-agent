import { buildTool } from './tool.js';
import { z } from 'zod';
import { exec } from 'child_process';

const schema = z.object({
  command: z.string().describe('The shell command to execute'),
  timeout: z.number().optional().default(30000).describe('Timeout in milliseconds')
});

export const bashTool = buildTool({
  name: 'bash',
  description: 'Execute a shell command.',
  inputSchema: schema,
  permissionLevel: 'ask',
  isReadOnly: false,
  execute: async ({ command, timeout }: z.infer<typeof schema>) => {
    return new Promise((resolve) => {
      exec(command, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const exitCode = error ? (error as any).code ?? 1 : 0;
        let output = '';
        if (stdout) output += `STDOUT:\n${stdout}\n`;
        if (stderr) output += `STDERR:\n${stderr}\n`;
        
        if (output.length > 10000) {
          output = output.substring(0, 10000) + '\n... (output truncated to 10000 characters)';
        }
        
        resolve(`Exit Code: ${exitCode}\n${output}`);
      });
    });
  }
});
