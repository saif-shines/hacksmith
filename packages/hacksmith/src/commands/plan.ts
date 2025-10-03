import { Command, CommandContext } from "../types/command.js";
import { BlueprintService } from "../services/blueprint-service.js";
import { UIService } from "../services/ui-service.js";
import { BlueprintFormatter } from "../utils/blueprint-formatter.js";
import { createPlanArgumentParser, PlanArgs } from "../types/arguments.js";
import { PLAN_COMMAND_DEFINITION } from "../types/command-options.js";
import chalk from "chalk";
import figures from "figures";

export class PlanCommand extends Command {
  name = PLAN_COMMAND_DEFINITION.name;
  description = PLAN_COMMAND_DEFINITION.description;
  aliases = PLAN_COMMAND_DEFINITION.aliases;

  async execute(args: string[], context: CommandContext): Promise<void> {
    const parser = createPlanArgumentParser();
    const parsed = parser.parse(args);

    // Validate arguments
    const validation = parser.validate(parsed);
    if (!validation.isValid) {
      validation.errors.forEach((error) => context.error(error));
      return;
    }

    // Show help if requested
    if (parsed.help || parsed.h) {
      this.showHelp(context);
      return;
    }

    // Handle GitHub repository processing
    const githubRepo = this.getGitHubRepo(parsed);
    if (githubRepo) {
      const outputJson = this.shouldOutputJson(parsed);
      await this.processInput(githubRepo, outputJson, context, true);
      return;
    }

    // Handle blueprint processing
    const blueprintPath = this.getBlueprintPath(parsed);
    if (blueprintPath) {
      const outputJson = this.shouldOutputJson(parsed);
      await this.processInput(blueprintPath, outputJson, context, false);
      return;
    }

    // Default help if no arguments
    this.showDefaultHelp(context);
  }

  private getBlueprintPath(parsed: PlanArgs): string | null {
    if (typeof parsed.blueprint === "string") return parsed.blueprint;
    if (typeof parsed.b === "string") return parsed.b;
    return null;
  }

  private getGitHubRepo(parsed: PlanArgs): string | null {
    if (typeof parsed.github === "string") return parsed.github;
    if (typeof parsed.g === "string") return parsed.g;
    return null;
  }

  private shouldOutputJson(parsed: PlanArgs): boolean {
    return !!parsed.json || !!parsed.j;
  }

  private async processInput(
    input: string,
    jsonOnly = false,
    context: CommandContext,
    allowListing = false
  ): Promise<void> {
    try {
      // Check if we can list blueprints from this input
      if (allowListing && BlueprintService.canList(input)) {
        context.spinner.start(`Fetching blueprints from ${input}...`);
        const options = await BlueprintService.listAvailable(input);
        context.spinner.stop(`${figures.tick} Found ${options.length} blueprint(s)`);

        const selectedUrl = await UIService.selectBlueprint(options);
        if (!selectedUrl) {
          return; // User cancelled selection
        }

        // Load the selected blueprint
        await this.loadAndDisplayBlueprint(selectedUrl, jsonOnly, context);
      } else {
        // Direct blueprint loading
        await this.loadAndDisplayBlueprint(input, jsonOnly, context);
      }
    } catch (error) {
      context.spinner.stop();
      const err = error as Error;
      const inputType = allowListing ? "repository" : "blueprint";
      context.error(`Error processing ${inputType}: ${err.message}`);
    }
  }

  private async loadAndDisplayBlueprint(
    input: string,
    jsonOnly: boolean,
    context: CommandContext
  ): Promise<void> {
    context.spinner.start(`Loading blueprint from ${input}...`);
    const blueprint = await BlueprintService.load(input);
    context.spinner.stop(`${figures.tick} Blueprint loaded successfully`);

    if (jsonOnly) {
      context.output(JSON.stringify(blueprint, null, 2));
      return;
    }

    const formatted = BlueprintFormatter.format(blueprint, input);
    BlueprintFormatter.print(formatted, context.output);
  }

  private showHelp(context: CommandContext): void {
    context.output(chalk.cyan.bold("Plan Command Help"));
    context.output("");
    context.output(chalk.yellow("Usage:"));
    context.output(chalk.gray("  Interactive mode:"));
    context.output("    /plan --blueprint <path>     Load and process a blueprint file");
    context.output("    /plan -b <path> --json       Output blueprint as JSON");
    context.output("    /plan --github <owner/repo>  List and select from GitHub repository");
    context.output("    /plan -g <owner/repo>        List and select from GitHub repository");
    context.output("    /plan --help                 Show this help message");
    context.output("");
    context.output(chalk.gray("  Direct command line:"));
    context.output("    hacksmith plan --blueprint <path>     Load and process a blueprint file");
    context.output("    hacksmith plan -b <path> --json       Output blueprint as JSON");
    context.output(
      "    hacksmith plan --github <owner/repo>  List and select from GitHub repository"
    );
    context.output(
      "    hacksmith plan -g <owner/repo>        List and select from GitHub repository"
    );
    context.output("    hacksmith plan --help                 Show this help message");
    context.output("");
    context.output(chalk.yellow("Examples:"));
    context.output(chalk.gray("  Interactive:"));
    context.output("    /plan --blueprint ./blueprint.toml");
    context.output("    /plan -b https://example.com/blueprint.toml");
    context.output("    /plan --github saif-shines/hacksmith-blueprints");
    context.output("    /plan --github=owner/repo --json");
    context.output("");
    context.output(chalk.gray("  Command line:"));
    context.output("    hacksmith plan --blueprint ./blueprint.toml");
    context.output("    hacksmith plan -b https://example.com/blueprint.toml");
    context.output("    hacksmith plan --github saif-shines/hacksmith-blueprints");
    context.output("    hacksmith plan --github=owner/repo --json");
    context.output("");
    context.output(chalk.yellow("Options:"));
    context.output(
      "  -b, --blueprint <path>  Path to blueprint TOML file (local path or HTTP URL)"
    );
    context.output("  -g, --github <repo>     GitHub repository (owner/repo format)");
    context.output("  -j, --json              Output only JSON format");
    context.output("  -h, --help              Show help");
  }

  private showDefaultHelp(context: CommandContext): void {
    context.output(`${figures.smiley} Planning...`);
    context.output("");
    context.output("Use --blueprint for files or --github for repositories:");
    context.output(chalk.gray("  Interactive mode:"));
    context.output("    /plan --blueprint ./path/to/blueprint.toml");
    context.output("    /plan --blueprint https://example.com/blueprint.toml");
    context.output("    /plan --github saif-shines/hacksmith-blueprints");
    context.output("    /plan --github=owner/repo --json");
    context.output("");
    context.output(chalk.gray("  Command line mode:"));
    context.output("    hacksmith plan --blueprint ./path/to/blueprint.toml");
    context.output("    hacksmith plan --blueprint https://example.com/blueprint.toml");
    context.output("    hacksmith plan --github saif-shines/hacksmith-blueprints");
    context.output("    hacksmith plan --github=owner/repo --json");
    context.output("");
    context.output('Type "/plan --help" or "hacksmith plan --help" for more options.');
  }
}
