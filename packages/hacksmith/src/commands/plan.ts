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

  async futurefunc(): Promise<void> {
    this.log(`here is the joke -- new stuff`);
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Plan);

    args.firstArg && this.futurefunc();
    flags.blueprint && this.log(`plan: blueprint: ${flags.blueprint}`);
  }
}
