import { Args, Command, Flags } from "@oclif/core";

export default class Plan extends Command {
  static description = "Current plan that under focus";

  static args = {
    firstArg: Args.string(),
  };

  static flags = {
    blueprint: Flags.string({
      description: "Blueprint to use for the plan",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Plan);
    this.log(`plan: first arg: ${args.firstArg}`);
    if (flags.blueprint) {
      this.log(`plan: blueprint: ${flags.blueprint}`);
    }
  }
}
