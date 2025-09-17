import { Args, Command } from "@oclif/core";

export default class Init extends Command {
  static description = "Initialize integration";

  static args = {
    provider: Args.string({ required: true }),
    usecase: Args.string({ required: true }),
  } as const;

  async run(): Promise<void> {
    this.log("init: placeholder - implement interactive onboarding");
  }
}
