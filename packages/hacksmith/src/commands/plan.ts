import { Command, CommandContext } from "../types/command.js";
import { BlueprintFetcher } from "../utils/blueprint-fetcher.js";
import { BlueprintFormatter } from "../utils/blueprint-formatter.js";
import { createPlanArgumentParser, PlanArgs } from "../types/arguments.js";
import chalk from "chalk";
import figures from "figures";
import { select } from "@clack/prompts";

export class PlanCommand extends Command {
  name = "plan";
  description = "Generate and manage integration plans";
  aliases = ["p"];

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
      await this.processGitHubRepo(githubRepo, outputJson, context);
      return;
    }

    // Handle blueprint processing
    const blueprintPath = this.getBlueprintPath(parsed);
    if (blueprintPath) {
      const outputJson = this.shouldOutputJson(parsed);
      await this.processBlueprint(blueprintPath, outputJson, context);
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

  private async processGitHubRepo(
    repoInput: string,
    jsonOnly = false,
    context: CommandContext
  ): Promise<void> {
    try {
      context.spinner.start(`Fetching blueprints from ${repoInput}...`);

      const blueprintFiles = await BlueprintFetcher.listBlueprintsFromRepo(repoInput);

      context.spinner.stop(`${figures.tick} Found ${blueprintFiles.length} blueprint(s)`);

      if (blueprintFiles.length === 1) {
        // Auto-select if only one blueprint
        const selectedFile = blueprintFiles[0];
        await this.processBlueprint(selectedFile.rawUrl, jsonOnly, context);
        return;
      }

      // Show selection for multiple blueprints
      const selectedPath = await select({
        message: "Select a blueprint file:",
        options: blueprintFiles.map((file) => ({
          value: file.rawUrl,
          label: file.name,
          hint: file.path,
        })),
      });

      if (typeof selectedPath === "string") {
        await this.processBlueprint(selectedPath, jsonOnly, context);
      }
    } catch (error) {
      context.spinner.stop();
      const err = error as Error;
      context.error(`Error processing GitHub repository: ${err.message}`);
    }
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
    context.output(`${figures.star} Hacksmith Plan Command`);
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
