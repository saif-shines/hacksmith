import type { Terminal } from "terminal-kit";

export interface CommandContext {
  terminal: Terminal | null;
  output: (message: string) => void;
  error: (message: string) => void;
  spinner: {
    start: (message: string) => void;
    stop: (message?: string) => void;
  };
}

export abstract class Command {
  abstract name: string;
  abstract description: string;
  abstract aliases?: string[];

  abstract execute(args: string[], context: CommandContext): Promise<void>;

  protected parseArgs(args: string[]): Record<string, string | boolean> {
    // Simple argument parsing - can be enhanced later
    const parsed: Record<string, string | boolean> = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith("--")) {
        const key = arg.slice(2);
        const value = args[i + 1] && !args[i + 1].startsWith("-") ? args[++i] : true;
        parsed[key] = value;
      } else if (arg.startsWith("-")) {
        const key = arg.slice(1);
        const value = args[i + 1] && !args[i + 1].startsWith("-") ? args[++i] : true;
        parsed[key] = value;
      }
    }
    return parsed;
  }
}
