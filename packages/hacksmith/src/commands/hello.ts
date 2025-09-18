import { Args, Command } from "@oclif/core";

export default class Hello extends Command {
  static description = "CLI greets hello";

  static args = {
    name: Args.string({ required: false, description: "name to greet" }),
  } as const;

  async run(): Promise<void> {
    const { args } = await this.parse(Hello);
    this.log(`hello${args.name ? ` ${args.name}` : ""}`);
  }
}
