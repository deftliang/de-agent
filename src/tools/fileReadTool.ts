import { z } from 'zod';
import * as fs from 'fs/promises';
import { buildTool } from './tool.js';

export const fileReadTool = buildTool({
  name: 'fileReadTool',
  description: 'Read file content with line numbers',
  permissionLevel: 'allow',
  isReadOnly: true,
  inputSchema: z.object({
    filePath: z.string(),
    startLine: z.number().optional(),
    endLine: z.number().optional()
  }),
  async execute({ filePath, startLine, endLine }) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let lines = content.split('\n');
      
      const s = startLine ? Math.max(1, startLine) : 1;
      const e = endLine ? Math.min(lines.length, endLine) : lines.length;
      
      lines = lines.slice(s - 1, e);
      
      if (lines.length > 2000) {
        const truncated = lines.slice(0, 2000).map((l, i) => `${s + i} | ${l}`).join('\n');
        return truncated + '\n\n... (truncated to 2000 lines)';
      }
      
      return lines.map((l, i) => `${s + i} | ${l}`).join('\n');
    } catch (err: any) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }
});
