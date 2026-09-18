import { buildTool } from './tool.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

const schema = z.object({
  pattern: z.string().describe('The regular expression pattern to search for'),
  path: z.string().optional().default('.').describe('The directory to search in'),
  include: z.string().optional().describe('Simple wildcard pattern for file extensions (e.g. *.ts)'),
  caseInsensitive: z.boolean().optional().default(false).describe('Case insensitive search')
});

export const grepTool = buildTool({
  name: 'grep',
  description: 'Regex text search across files in a directory.',
  inputSchema: schema,
  permissionLevel: 'allow',
  isReadOnly: true,
  execute: async ({ pattern, path: searchPath, include, caseInsensitive }: z.infer<typeof schema>) => {
    const results: string[] = [];
    const MAX_RESULTS = 50;
    let matchCount = 0;
    
    const searchRegex = new RegExp(pattern, caseInsensitive ? 'i' : '');
    
    let includeRegex: RegExp | null = null;
    if (include) {
      const extRegexStr = '^' + include.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
      includeRegex = new RegExp(extRegexStr);
    }

    async function walk(currentPath: string) {
      if (matchCount >= MAX_RESULTS) return;

      let entries;
      try {
        entries = await fs.readdir(currentPath, { withFileTypes: true });
      } catch (err) {
        return; // Skip directories we can't read
      }

      for (const entry of entries) {
        if (matchCount >= MAX_RESULTS) break;
        if (entry.name === '.git' || entry.name === 'node_modules') continue;

        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (includeRegex && !includeRegex.test(entry.name)) continue;
          
          try {
            // Read first few bytes to check if binary
            const fh = await fs.open(fullPath, 'r');
            const buffer = Buffer.alloc(1024);
            const { bytesRead } = await fh.read(buffer, 0, 1024, 0);
            await fh.close();
            
            let isBinary = false;
            for (let i = 0; i < bytesRead; i++) {
              if (buffer[i] === 0) {
                isBinary = true;
                break;
              }
            }
            if (isBinary) continue;

            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
              if (matchCount >= MAX_RESULTS) break;
              if (searchRegex.test(lines[i])) {
                results.push(`${fullPath}:${i + 1}:${lines[i]}`);
                matchCount++;
              }
            }
          } catch (err) {
            // Ignore unreadable files
          }
        }
      }
    }

    await walk(searchPath);

    if (results.length === 0) {
      return 'No matches found.';
    }

    let output = results.join('\n');
    if (matchCount >= MAX_RESULTS) {
      output += '\n... (truncated to 50 matches)';
    }

    return output;
  }
});
