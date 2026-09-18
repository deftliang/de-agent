import { z } from 'zod';
import * as fs from 'fs/promises';
import { buildTool } from './tool.js';

export const fileEditTool = buildTool({
  name: 'fileEditTool',
  description: 'Precise string replacement in a file',
  permissionLevel: 'ask',
  isReadOnly: false,
  inputSchema: z.object({
    filePath: z.string(),
    oldString: z.string(),
    newString: z.string()
  }),
  async execute({ filePath, oldString, newString }) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const occurrences = content.split(oldString).length - 1;
      
      if (occurrences === 0) {
        throw new Error('oldString not found in file.');
      } else if (occurrences > 1) {
        throw new Error(`Found ${occurrences} occurrences of oldString. oldString must be unique.`);
      }
      
      const newContent = content.replace(oldString, newString);
      await fs.writeFile(filePath, newContent, 'utf-8');
      
      return `Successfully replaced string in ${filePath}.\n\n--- Diff ---\n- ${oldString}\n+ ${newString}\n`;
    } catch (err: any) {
      throw new Error(`Failed to edit file: ${err.message}`);
    }
  }
});
