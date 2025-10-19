import { spinner } from "@clack/prompts";
import chalk from "chalk";
import figures from "figures";
import terminal from "terminal-kit";
import ora from "ora";
import { CommandContext } from "@/types/command.js";

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
  let currentSpinner: ReturnType<typeof ora> | null = null;

  return {
    terminal: null,
    output: (message: string) => console.log(message),
    error: (message: string) => console.log(chalk.red(`${figures.cross} ${message}`)),
    spinner: {
      start: (message: string) => {
        // Clear any existing spinner
        if (currentSpinner) {
          currentSpinner.stop();
        }
        currentSpinner = ora({
          text: message,
          color: "cyan",
        }).start();
      },
      stop: (message?: string) => {
        if (currentSpinner) {
          if (message) {
            currentSpinner.succeed(message);
          } else {
            currentSpinner.stop();
          }
          currentSpinner = null;
        }
      },
    },
  };
}
