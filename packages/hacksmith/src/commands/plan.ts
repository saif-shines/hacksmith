import { Args, Command, Flags } from "@oclif/core";
import { BlueprintFetcher } from "../utils/blueprint-fetcher.js";
import { BlueprintFormatter } from "../utils/blueprint-formatter.js";

export default class Plan extends Command {
  static description = "Generate and manage integration plans";

  static examples = [
    "<%= config.bin %> <%= command.id %> --blueprint ./blueprint.toml",
    "<%= config.bin %> <%= command.id %> --blueprint https://example.com/blueprint.toml",
  ];

  static args = {
    firstArg: Args.string({
      description: "Optional first argument",
    }),
  };

  static flags = {
    blueprint: Flags.string({
      description: "Path to blueprint TOML file (local path or HTTP URL)",
      char: "b",
    }),
    json: Flags.boolean({
      description: "Output only JSON format",
      char: "j",
    }),
  };

  private async processBlueprint(blueprintPath: string, jsonOnly = false): Promise<void> {
    try {
      const blueprint = await BlueprintFetcher.load(blueprintPath);

      if (jsonOnly) {
        console.log(JSON.stringify(blueprint, null, 2));
        return;
      }

      const formatted = BlueprintFormatter.format(blueprint, blueprintPath);
      BlueprintFormatter.print(formatted, this.log.bind(this));
    } catch (error) {
      const err = error as Error;
      this.error(`❌ Error processing blueprint: ${err.message}`);
    }
  }

  private showDefaultHelp(): void {
    this.log("🔨 Hacksmith Plan Command");
    this.log("\nUse --blueprint to specify a blueprint file:");
    this.log("  hacksmith plan --blueprint ./path/to/blueprint.toml");
    this.log("  hacksmith plan --blueprint https://example.com/blueprint.toml");
    this.log("  hacksmith plan --blueprint ./blueprint.toml --json  # JSON output only");
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Plan);

    if (flags.blueprint) {
      await this.processBlueprint(flags.blueprint, flags.json);
      return;
    }

    if (args.firstArg) {
      this.log("🚧 Future functionality placeholder");
      return;
    }

    this.showDefaultHelp();
  }
}
