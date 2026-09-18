import * as readline from 'readline/promises';
import chalk from 'chalk';

export class Input {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue.bold('> ')
    });

    this.rl.on('SIGINT', () => {
      console.log(chalk.yellow('\nInput cancelled. Use Ctrl+D or type "exit" to quit.'));
      this.rl.prompt();
    });
  }

  async getInput(): Promise<string | null> {
    try {
      const line = await this.rl.question(chalk.blue.bold('> '));
      const trimmed = line.trim();
      if (trimmed === 'exit' || trimmed === 'quit') {
        return null;
      }
      if (trimmed.length > 0) {
        return trimmed;
      }
      return this.getInput(); // recursive retry if empty
    } catch (e: any) {
      if (e.code === 'ABORT_ERR') {
        return null;
      }
      return null;
    }
  }

  close(): void {
    this.rl.close();
  }
}
