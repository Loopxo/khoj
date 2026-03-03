import chalk from 'chalk';
import ora, { type Ora } from 'ora';

let _spinner: Ora | null = null;

export const logger = {
  info(msg: string): void {
    if (_spinner) _spinner.stop();
    console.log(chalk.blue(`ℹ  ${msg}`));
  },

  success(msg: string): void {
    if (_spinner) _spinner.stop();
    console.log(chalk.green(`✔  ${msg}`));
  },

  warn(msg: string): void {
    if (_spinner) _spinner.stop();
    console.warn(chalk.yellow(`⚠  ${msg}`));
  },

  error(msg: string, err?: unknown): void {
    if (_spinner) _spinner.stop();
    console.error(chalk.red(`✖  ${msg}`));
    if (err instanceof Error) {
      console.error(chalk.dim(`   ${err.message}`));
    }
  },

  step(emoji: string, msg: string): void {
    if (_spinner) _spinner.stop();
    console.log(`${emoji} ${chalk.bold(msg)}`);
  },

  dim(msg: string): void {
    console.log(chalk.dim(`   ${msg}`));
  },

  stat(label: string, value: string): void {
    console.log(`  ${chalk.cyan(label.padEnd(20))} ${chalk.white(value)}`);
  },

  divider(): void {
    console.log(chalk.dim('─'.repeat(60)));
  },

  spinner(msg: string): Ora {
    _spinner = ora({ text: msg, color: 'cyan' }).start();
    return _spinner;
  },

  stopSpinner(success = true, msg?: string): void {
    if (!_spinner) return;
    if (success) {
      _spinner.succeed(msg);
    } else {
      _spinner.fail(msg);
    }
    _spinner = null;
  },

  banner(): void {
    console.log('');
    console.log(chalk.bold.cyan('  ██╗  ██╗██╗  ██╗ ██████╗      ██╗'));
    console.log(chalk.bold.cyan('  ██║ ██╔╝██║  ██║██╔═══██╗     ██║'));
    console.log(chalk.bold.cyan('  █████╔╝ ███████║██║   ██║     ██║'));
    console.log(chalk.bold.cyan('  ██╔═██╗ ██╔══██║██║   ██║██   ██║'));
    console.log(chalk.bold.cyan('  ██║  ██╗██║  ██║╚██████╔╝╚█████╔╝'));
    console.log(chalk.bold.cyan('  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚════╝'));
    console.log('');
    console.log(chalk.dim('  Website context packager for AI agents'));
    console.log('');
  },
};
