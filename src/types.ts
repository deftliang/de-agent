export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  output: string;
  isError: boolean;
}

export interface Message {
  role: Role;
  content?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
}

export class ConversationHistory {
  private messages: Message[] = [];

  addMessage(msg: Message): void {
    this.messages.push(msg);
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  estimateTokens(): number {
    return this.messages.reduce((acc, msg) => {
      const content = msg.content || '';
      const toolCalls = msg.toolCalls ? JSON.stringify(msg.toolCalls) : '';
      return acc + Math.ceil((content.length + toolCalls.length) / 4) + 10;
    }, 0);
  }

  truncateToFit(maxTokens: number): void {
    while (this.estimateTokens() > maxTokens && this.messages.length > 1) {
      if (this.messages[0].role === 'system') {
        this.messages.splice(1, 1);
      } else {
        this.messages.shift();
      }
    }
  }
}
