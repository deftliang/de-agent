import { buildTool } from './tool.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

const schema = z.object({
  pattern: z.string().describe('The pattern to match (e.g. *.ts)'),
  path: z.string().optional().default('.').describe('The root path to search in'),
  includeHidden: z.boolean().optional().default(false).describe('Whether to include hidden files/directories')
});

export const globTool = buildTool({
  name: 'glob',
  description: 'Search for files matching a simple pattern.',
  inputSchema: schema,
  permissionLevel: 'allow',
  isReadOnly: true,
  execute: async ({ pattern, path: searchPath, includeHidden }: z.infer<typeof schema>) => {
    const results: string[] = [];
    const MAX_RESULTS = 100;
    
    // Convert glob-like pattern (* or ?) to regex for basename matching
    const regexStr = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
    const regex = new RegExp(regexStr);

    async function walk(currentPath: string) {
      if (results.length >= MAX_RESULTS) return;

      let entries;
      try {
        entries = await fs.readdir(currentPath, { withFileTypes: true });
      } catch (err) {
        return; // Skip directories we can't read
      }

      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) break;
        if (!includeHidden && entry.name.startsWith('.')) continue;

        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (regex.test(entry.name)) {
            try {
              const stats = await fs.stat(fullPath);
              results.push(`${fullPath} (${stats.size} bytes)`);
            } catch (err) {
              results.push(`${fullPath} (unknown size)`);
            }
          }
        }
      }
    }

    await walk(searchPath);

    if (results.length === 0) {
      return 'No matches found.';
    }

    let output = results.join('\n');
    if (results.length >= MAX_RESULTS) {
      output += '\n... (truncated to 100 matches)';
    }

    return output;
  }
});
