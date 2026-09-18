import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationHistory } from '../src/types.js';

describe('ConversationHistory', () => {
  test('should add messages and estimate tokens correctly', () => {
    const history = new ConversationHistory();
    history.addMessage({ role: 'user', content: 'Hello' });
    history.addMessage({ role: 'assistant', content: 'Hi there! How can I help you today?' });

    const messages = history.getMessages();
    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, 'user');
    
    const tokens = history.estimateTokens();
    assert.ok(tokens > 5 && tokens < 50, `Token estimation ${tokens} should be reasonable`);
  });

  test('should truncate history to fit max tokens while preserving system message if present', () => {
    const history = new ConversationHistory();
    history.addMessage({ role: 'system', content: 'You are an AI' });
    
    // Add many messages
    for (let i = 0; i < 100; i++) {
      history.addMessage({ role: 'user', content: `Message ${i}` });
      history.addMessage({ role: 'assistant', content: `Reply ${i}` });
    }

    assert.equal(history.getMessages().length, 201);
    const initialTokens = history.estimateTokens();

    history.truncateToFit(100); // 100 tokens max

    const messages = history.getMessages();
    assert.ok(messages.length < 201, 'History should be truncated');
    assert.equal(messages[0].role, 'system', 'System message should be preserved');
    assert.ok(history.estimateTokens() <= 100, 'Tokens should be within limit');
  });
});
