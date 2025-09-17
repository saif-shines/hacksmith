import { Args, Command } from "@oclif/core";

export default class Plan extends Command {
  static description = "Emit a structured plan";

  static args = {
    provider: Args.string({ required: true }),
    usecase: Args.string({ required: true }),
  } as const;

  async run(): Promise<void> {
    this.log("plan: placeholder - emit structured plan JSON");
  }
}
