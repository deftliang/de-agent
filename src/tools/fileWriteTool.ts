import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { buildTool } from './tool.js';

export const fileWriteTool = buildTool({
  name: 'fileWriteTool',
  description: 'Create or overwrite files',
  permissionLevel: 'ask',
  isReadOnly: false,
  inputSchema: z.object({
    filePath: z.string(),
    content: z.string()
  }),
  async execute({ filePath, content }) {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      const stats = await fs.stat(filePath);
      return `File successfully written: ${filePath} (${stats.size} bytes)`;
    } catch (err: any) {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  }
});
