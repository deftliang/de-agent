import chalk from 'chalk';
import * as readline from 'readline';

export class Display {
  printWelcome(): void {
    const logo = `
       __                                  __ 
  ____/ /__        ____ _____ ____  ____  / /_
 / __  / _ \\______/ __ \`/ __ \`/ _ \\/ __ \\/ __/
/ /_/ /  __/_____/ /_/ / /_/ /  __/ / / / /_  
\\__,_/\\___/      \\__,_/\\__, /\\___/_/ /_/\\__/  
                      /____/                  
`;
    console.log(chalk.cyan.bold(logo));
    console.log(chalk.dim('==================================================='));
    console.log(chalk.green.bold('✨ Welcome to de-agent!'));
    console.log(chalk.gray('Your terminal AI Coding Assistant is ready to help.'));
    console.log(chalk.dim('===================================================\n'));
  }

  printUserMessage(msg: string): void {
    console.log(chalk.magenta.bold('\nUser: ') + msg);
  }

  streamText(delta: string): void {
    process.stdout.write(delta);
  }

  endStream(): void {
    process.stdout.write('\n');
  }

  printToolUse(name: string, args: Record<string, unknown>): void {
    console.log(chalk.cyan(`\n┌─ Tool Call: ${name} ────────`));
    const argsStr = JSON.stringify(args, null, 2).split('\n').map(l => chalk.cyan('│ ') + l).join('\n');
    console.log(argsStr);
    console.log(chalk.cyan(`└────────────────────────────────`));
  }

  printToolResult(name: string, result: string, isError: boolean): void {
    const lines = result.split('\n');
    const color = isError ? chalk.red : chalk.gray;
    const prefix = color(isError ? '✖' : '✔') + ' ' + color.bold(name) + ' ';
    console.log(prefix + color(lines[0] || ''));
    if (lines.length > 1) {
      console.log(color('  ' + lines.slice(1).join('\n  ')));
    }
  }

  printDiff(diff: string): void {
    const lines = diff.split('\n');
    for (const line of lines) {
      if (line.startsWith('+')) console.log(chalk.green(line));
      else if (line.startsWith('-')) console.log(chalk.red(line));
      else console.log(line);
    }
  }

  async askPermission(toolName: string, description: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(chalk.yellow(`\nAllow tool '${toolName}' to run? [Y/n]\n${description}\n> `), (answer) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        if (normalized === 'n' || normalized === 'no') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  printError(msg: string): void {
    console.log(chalk.red.bold('\nError: ') + chalk.red(msg));
  }

  printCost(tokensIn: number, tokensOut: number): void {
    console.log(chalk.gray(`Tokens: ${tokensIn} in, ${tokensOut} out`));
  }
}
