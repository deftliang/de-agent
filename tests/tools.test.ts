import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import { fileWriteTool } from '../src/tools/fileWriteTool.js';
import { fileReadTool } from '../src/tools/fileReadTool.js';
import { fileEditTool } from '../src/tools/fileEditTool.js';
import { bashTool } from '../src/tools/bashTool.js';

describe('Tools Integration Tests', () => {
  let tempDir: string;
  let testFile: string;

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'de-agent-test-'));
    testFile = path.join(tempDir, 'test.txt');
  });

  after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('fileWriteTool should create a file', async () => {
    const result = await fileWriteTool.execute({
      filePath: testFile,
      content: 'Hello, world!\nLine 2\nLine 3'
    });
    assert.match(result, /File successfully written/);
    
    const content = await fs.readFile(testFile, 'utf-8');
    assert.equal(content, 'Hello, world!\nLine 2\nLine 3');
  });

  test('fileReadTool should read the file with line numbers', async () => {
    const result = await fileReadTool.execute({ filePath: testFile });
    assert.match(result, /1 \| Hello, world!/);
    assert.match(result, /3 \| Line 3/);
  });

  test('fileEditTool should modify the file correctly', async () => {
    const result = await fileEditTool.execute({
      filePath: testFile,
      oldString: 'Line 2',
      newString: 'Modified Line 2'
    });
    assert.match(result, /Successfully replaced string in/);

    const content = await fs.readFile(testFile, 'utf-8');
    assert.match(content, /Modified Line 2/);
    assert.doesNotMatch(content, /^Line 2$/m); // Old string should be gone
  });

  test('bashTool should execute commands', async () => {
    const result = await bashTool.execute({ command: 'echo "bash_test_output"' });
    assert.match(result, /bash_test_output/);
    assert.match(result, /Exit Code: 0/);
  });
});
