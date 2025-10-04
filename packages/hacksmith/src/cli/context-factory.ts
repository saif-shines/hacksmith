import { spinner } from "@clack/prompts";
import chalk from "chalk";
import figures from "figures";
import terminal from "terminal-kit";
import { CommandContext } from "../types/command.js";

export type ContextMode = "interactive" | "non-interactive";

export function createCommandContext(mode: ContextMode): CommandContext {
  if (mode === "interactive") {
    return createInteractiveContext();
  }
  return createNonInteractiveContext();
}

export function createInteractiveContext(): CommandContext {
  let currentSpinner: ReturnType<typeof spinner> | null = null;
  const term = terminal.terminal;

  return {
    terminal: term,
    output: (message: string) => {
      console.log(message);
    },
    error: (message: string) => {
      console.log(chalk.red(`${figures.cross} ${message}`));
    },
    spinner: {
      start: (message: string) => {
        currentSpinner = spinner();
        currentSpinner.start(message);
      },
      stop: (message?: string) => {
        if (currentSpinner) {
          currentSpinner.stop(message || "Done");
          currentSpinner = null;
        }
      },
    },
  };
}

export function createNonInteractiveContext(): CommandContext {
  return {
    terminal: null,
    output: (message: string) => console.log(message),
    error: (message: string) => console.log(chalk.red(`${figures.cross} ${message}`)),
    spinner: {
      start: (message: string) => console.log(chalk.gray(`${figures.ellipsis} ${message}`)),
      stop: (message?: string) => {
        if (message) console.log(chalk.green(`${figures.tick} ${message}`));
      },
    },
  };
}
