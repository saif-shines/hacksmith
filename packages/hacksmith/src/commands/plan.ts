import { Command, CommandContext } from "../types/command.js";
import { BlueprintFetcher } from "../utils/blueprint-fetcher.js";
import { BlueprintFormatter } from "../utils/blueprint-formatter.js";
import chalk from "chalk";
import figures from "figures";

export class PlanCommand extends Command {
  name = "plan";
  description = "Generate and manage integration plans";
  aliases = ["p"];

  async execute(args: string[], context: CommandContext): Promise<void> {
    const parsed = this.parseArgs(args);

    // Show help if requested
    if (parsed.help || parsed.h) {
      this.showHelp(context);
      return;
    }

    // Handle blueprint processing
    if (parsed.blueprint || parsed.b) {
      const blueprintPath = parsed.blueprint || parsed.b;
      await this.processBlueprint(blueprintPath, parsed.json || parsed.j, context);
      return;
    }

    // Default help if no arguments
    this.showDefaultHelp(context);
  }

  private async processBlueprint(
    blueprintPath: string,
    jsonOnly = false,
    context: CommandContext
  ): Promise<void> {
    try {
      context.spinner.start(`Loading blueprint from ${blueprintPath}...`);

      const blueprint = await BlueprintFetcher.load(blueprintPath);

      context.spinner.stop(`${figures.tick} Blueprint loaded successfully`);

      if (jsonOnly) {
        context.output(JSON.stringify(blueprint, null, 2));
        return;
      }

      const formatted = BlueprintFormatter.format(blueprint, blueprintPath);
      BlueprintFormatter.print(formatted, context.output);
    } catch (error) {
      context.spinner.stop();
      const err = error as Error;
      context.error(`Error processing blueprint: ${err.message}`);
    }
  }

  private showHelp(context: CommandContext): void {
    context.output(chalk.cyan.bold("Plan Command Help"));
    context.output("");
    context.output(chalk.yellow("Usage:"));
    context.output("  /plan --blueprint <path>     Load and process a blueprint file");
    context.output("  /plan -b <path> --json       Output blueprint as JSON");
    context.output("  /plan --help                 Show this help message");
    context.output("");
    context.output(chalk.yellow("Examples:"));
    context.output("  /plan --blueprint ./blueprint.toml");
    context.output("  /plan -b https://example.com/blueprint.toml");
    context.output("  /plan --blueprint ./blueprint.toml --json");
    context.output("");
    context.output(chalk.yellow("Options:"));
    context.output(
      "  -b, --blueprint <path>  Path to blueprint TOML file (local path or HTTP URL)"
    );
    context.output("  -j, --json              Output only JSON format");
    context.output("  -h, --help              Show help");
  }

  private showDefaultHelp(context: CommandContext): void {
    context.output(`${figures.star} Hacksmith Plan Command`);
    context.output("");
    context.output("Use --blueprint to specify a blueprint file:");
    context.output("  /plan --blueprint ./path/to/blueprint.toml");
    context.output("  /plan --blueprint https://example.com/blueprint.toml");
    context.output("  /plan --blueprint ./blueprint.toml --json");
    context.output("");
    context.output('Type "/plan --help" for more options.');
  }
}
