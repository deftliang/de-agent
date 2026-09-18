import { buildTool } from './tool.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

const schema = z.object({
  path: z.string().describe('The directory path to list')
});

export const listDirTool = buildTool({
  name: 'list_dir',
  description: 'List contents of a directory.',
  inputSchema: schema,
  permissionLevel: 'allow',
  isReadOnly: true,
  execute: async ({ path: dirPath }: z.infer<typeof schema>) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      const detailedEntries = await Promise.all(entries.map(async (entry) => {
        let size = 0;
        if (entry.isFile()) {
          try {
            const stats = await fs.stat(path.join(dirPath, entry.name));
            size = stats.size;
          } catch (e) {
            // Ignore stat errors
          }
        }
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size
        };
      }));

      detailedEntries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      if (detailedEntries.length === 0) {
        return 'Directory is empty.';
      }

      const lines = detailedEntries.map(e => {
        if (e.isDirectory) {
          return `[DIR]  ${e.name}`;
        }
        return `[FILE] ${e.name} (${e.size} bytes)`;
      });

      return lines.join('\n');
    } catch (err: any) {
      return `Failed to list directory: ${err.message}`;
    }
  }
});
