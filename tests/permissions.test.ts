import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PermissionEvaluator } from '../src/engine/permissions.js';

describe('PermissionEvaluator', () => {
  const evaluator = new PermissionEvaluator();

  test('should allow safe commands', () => {
    assert.equal(evaluator.evaluateBash('ls -la'), 'allow');
    assert.equal(evaluator.evaluateBash('pwd'), 'allow');
    assert.equal(evaluator.evaluateBash('git status'), 'allow');
    assert.equal(evaluator.evaluateBash('cat package.json'), 'allow');
  });

  test('should deny dangerous commands', () => {
    assert.equal(evaluator.evaluateBash('rm -rf /'), 'deny');
    assert.equal(evaluator.evaluateBash('sudo rm -rf /'), 'deny');
    assert.equal(evaluator.evaluateBash('chmod 777 file.txt'), 'deny');
    assert.equal(evaluator.evaluateBash('echo "hello" > /dev/sda'), 'deny');
  });

  test('should ask for unknown or potentially modifying commands', () => {
    assert.equal(evaluator.evaluateBash('npm install'), 'ask');
    assert.equal(evaluator.evaluateBash('curl http://example.com'), 'ask');
    assert.equal(evaluator.evaluateBash('mkdir new_folder'), 'ask');
  });
});
