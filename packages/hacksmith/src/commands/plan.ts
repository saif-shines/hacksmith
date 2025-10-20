import { confirm, log } from "@clack/prompts";
import clipboardy from "clipboardy";
import { readFileSync } from "fs";
import { Command, CommandContext } from "@/types/command.js";
import { BlueprintService } from "@/services/blueprint-service.js";
import { UIService } from "@/services/ui-service.js";
import { BlueprintFormatter } from "@/utils/blueprint-formatter.js";
import { FlowExecutor } from "@/services/flow-executor.js";
import { createPlanArgumentParser, PlanArgs } from "@/types/arguments.js";
import { PLAN_COMMAND_DEFINITION } from "@/types/command-options.js";
import { MissionBriefGenerator } from "@/utils/mission-brief-generator.js";
import { AIAgentInvoker } from "@/utils/ai-agent-invoker.js";
import { preferences } from "@/utils/preferences-storage.js";
import { getBlueprintId } from "@/utils/storage.js";
import { isNotCancelled } from "@/utils/type-guards.js";
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
      validation.errors.forEach((error) => log.error(error));
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
      const shouldExecute = this.shouldExecuteFlow(parsed);
      const devMode = this.isDevMode(parsed);
      await this.processInput(githubRepo, outputJson, context, true, shouldExecute, devMode);
      return;
    }

    // Handle blueprint processing
    const blueprintPath = this.getBlueprintPath(parsed);
    if (blueprintPath) {
      const outputJson = this.shouldOutputJson(parsed);
      const shouldExecute = this.shouldExecuteFlow(parsed);
      const devMode = this.isDevMode(parsed);
      await this.processInput(blueprintPath, outputJson, context, false, shouldExecute, devMode);
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

  private shouldExecuteFlow(parsed: PlanArgs): boolean {
    return !!parsed.execute || !!parsed.e;
  }

  private isDevMode(parsed: PlanArgs): boolean {
    return !!parsed.dev || !!parsed.d;
  }

  private async processInput(
    input: string,
    jsonOnly = false,
    context: CommandContext,
    allowListing = false,
    executeFlow = false,
    devMode = false
  ): Promise<void> {
    try {
      // Check if we can list blueprints from this input
      if (allowListing && BlueprintService.canList(input)) {
        context.spinner.start(`Reading blueprints from ${input}...`);
        const options = await BlueprintService.listAvailable(input);
        context.spinner.stop(`Found ${options.length} blueprint(s)`);

        const selectedUrl = await UIService.selectBlueprint(options);
        if (!selectedUrl) {
          return; // User cancelled selection
        }

        // Load the selected blueprint
        await this.loadAndDisplayBlueprint(selectedUrl, jsonOnly, context, executeFlow, devMode);
      } else {
        // Direct blueprint loading
        await this.loadAndDisplayBlueprint(input, jsonOnly, context, executeFlow, devMode);
      }
    } catch (error) {
      context.spinner.stop();
      const err = error as Error;
      this.handleBlueprintError(err, allowListing);
    }
  }

  private async loadAndDisplayBlueprint(
    input: string,
    jsonOnly: boolean,
    context: CommandContext,
    executeFlow: boolean,
    devMode: boolean
  ): Promise<void> {
    context.spinner.start(`Reading blueprints from ${input}...`);
    const blueprint = await BlueprintService.load(input);
    context.spinner.stop();

    // Show step-based info using clack
    log.step(`Blueprint: ${input.split("/").pop()}`);
    log.step(`Topic: ${blueprint.overview?.description || "No description available"}`);

    // Check if there are no executable flows
    const hasFlows = blueprint.flows && blueprint.flows.length > 0;
    if (!hasFlows) {
      this.showNoFlowsWarning(input);
    }

    if (jsonOnly) {
      context.output(JSON.stringify(blueprint, null, 2));
      return;
    }

    // Check if we should execute flows
    if (executeFlow && blueprint.flows && blueprint.flows.length > 0) {
      const executor = new FlowExecutor(devMode);
      const result = await executor.executeFlows(blueprint);

      if (result.success) {
        executor.displaySummary();

        // Generate mission brief after successful execution
        try {
          const flowNames = blueprint.flows.map((flow) => flow.title);
          const blueprintName = blueprint.name || "Unknown Blueprint";
          const blueprintId = getBlueprintId(blueprint);
          const agentPrompt = blueprint.agent?.prompt_template;

          const briefPath = MissionBriefGenerator.save({
            blueprintName,
            blueprintId,
            flowsExecuted: flowNames,
            executionSummary: `Successfully executed ${flowNames.length} flow(s) from ${blueprintName} blueprint.`,
            agentPrompt,
          });

          context.output(
            chalk.cyan(`\n${figures.info} Mission brief generated: ${chalk.bold(briefPath)}`)
          );

          // Check if AI agent is configured and offer to invoke it
          if (AIAgentInvoker.isConfigured()) {
            const agentName = AIAgentInvoker.getConfiguredAgentName();
            const shouldInvoke = await confirm({
              message: `Launch ${agentName} to continue with integration?`,
              initialValue: true,
            });

            if (isNotCancelled(shouldInvoke) && shouldInvoke) {
              context.output(
                chalk.cyan(`\n${figures.pointer} Launching ${agentName} with mission brief...\n`)
              );

              try {
                await AIAgentInvoker.invoke({
                  missionBriefPath: briefPath,
                  workingDirectory: process.cwd(),
                });
              } catch (error) {
                context.output(
                  chalk.yellow(
                    `\n${figures.warning} Could not invoke ${agentName}: ${error instanceof Error ? error.message : String(error)}`
                  )
                );
                context.output(
                  chalk.gray(
                    `${figures.pointer} You can manually open the mission brief at: ${briefPath}`
                  )
                );
              }
            } else {
              context.output(
                chalk.gray(`\n${figures.pointer} Mission brief is ready at: ${briefPath}`)
              );
            }
          } else {
            // No AI agent configured or manual mode - offer to copy to clipboard
            const aiAgent = preferences.getAIAgent();
            const isManualMode = aiAgent?.provider === "none";

            if (isManualMode) {
              context.output(
                chalk.cyan(
                  `\n${figures.info} Manual mode: Mission brief ready for your AI assistant.`
                )
              );
            } else {
              log.warn(`No AI agent CLI configured.`);
              context.output(
                chalk.gray(
                  `${figures.pointer} You can use VS Code Copilot, Cursor, Windsurf, or other AI assistants.`
                )
              );
            }

            const shouldCopy = await confirm({
              message: "Copy mission brief to clipboard?",
              initialValue: true,
            });

            if (isNotCancelled(shouldCopy) && shouldCopy) {
              try {
                const briefContent = readFileSync(briefPath, "utf-8");
                await clipboardy.write(briefContent);
                context.output(
                  chalk.green(
                    `\n${figures.tick} Mission brief copied to clipboard! Paste it into your AI assistant.`
                  )
                );
              } catch (error) {
                log.warn(
                  `Could not copy to clipboard: ${error instanceof Error ? error.message : String(error)}`
                );
                context.output(chalk.gray(`${figures.pointer} Mission brief is at: ${briefPath}`));
              }
            } else {
              context.output(
                chalk.gray(`\n${figures.pointer} Mission brief is ready at: ${briefPath}`)
              );
              if (!isManualMode) {
                context.output(
                  chalk.gray(
                    `${figures.pointer} Run ${chalk.cyan("hacksmith preferences setup")} to configure an AI CLI.`
                  )
                );
              }
            }
          }
        } catch (error) {
          // Non-fatal error - log but don't fail
          context.output(
            chalk.yellow(
              `\n${figures.warning} Could not generate mission brief: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      } else if (result.cancelled) {
        context.output(chalk.yellow("\nFlow execution cancelled"));
      } else {
        log.error(`Flow execution failed: ${result.error || "Unknown error"}`);
      }

      return;
    }

    const formatted = BlueprintFormatter.format(blueprint, input, devMode);
    BlueprintFormatter.print(formatted, context.output);
  }

  private showHelp(context: CommandContext): void {
    context.output(chalk.cyan.bold("Plan Command Help"));
    context.output("");

    // Lead with examples (per clig.dev guidelines)
    context.output(chalk.yellow("Examples:"));
    context.output(chalk.gray("  Interactive mode:"));
    context.output("    /plan --blueprint ./blueprint.toml");
    context.output("    /plan -b ./blueprint.toml --execute");
    context.output("    /plan -b https://example.com/blueprint.toml");
    context.output("    /plan --github saif-shines/hacksmith-blueprints");
    context.output("");
    context.output(chalk.gray("  Command line mode:"));
    context.output("    hacksmith plan --blueprint ./blueprint.toml");
    context.output("    hacksmith plan -b ./blueprint.toml --execute");
    context.output("    hacksmith ./blueprint.toml              " + chalk.gray("# Auto-executes"));
    context.output("    hacksmith plan -b https://example.com/blueprint.toml");
    context.output("    hacksmith plan --github saif-shines/hacksmith-blueprints");
    context.output(
      "    hacksmith saif-shines/hacksmith-blueprints   " + chalk.gray("# Auto-executes")
    );
    context.output("");

    context.output(chalk.yellow("Options:"));
    context.output(
      "  -b, --blueprint <path>  Path to blueprint TOML file (local path or HTTP URL)"
    );
    context.output("  -g, --github <repo>     GitHub repository (owner/repo format)");
    context.output("  -e, --execute           Execute blueprint flows interactively");
    context.output("  -j, --json              Output blueprint as JSON");
    context.output("  -h, --help              Show this help");
  }

  private showDefaultHelp(context: CommandContext): void {
    context.output(`${figures.smiley} Let's get started with a blueprint!`);
    context.output("");

    // Lead with examples (per clig.dev guidelines)
    context.output(chalk.yellow("Quick Examples:"));
    context.output(chalk.gray("  Interactive mode:"));
    context.output("    /plan --blueprint ./path/to/blueprint.toml");
    context.output("    /plan -b ./blueprint.toml --execute     " + chalk.gray("# Run flows"));
    context.output("    /plan --github saif-shines/hacksmith-blueprints");
    context.output("");
    context.output(chalk.gray("  Command line mode:"));
    context.output("    hacksmith plan --blueprint ./path/to/blueprint.toml");
    context.output("    hacksmith plan -b ./blueprint.toml --execute");
    context.output("    hacksmith ./blueprint.toml              " + chalk.gray("# Auto-executes"));
    context.output("    hacksmith plan --github saif-shines/hacksmith-blueprints");
    context.output(
      "    hacksmith saif-shines/hacksmith-blueprints   " + chalk.gray("# Auto-executes")
    );
    context.output("");
    context.output('Type "/plan --help" or "hacksmith plan --help" for more options.');
  }

  private showNoFlowsWarning(input: string): void {
    // Check if this is a GitHub URL and extract repo info
    const githubMatch = input.match(/github\.com\/([^/]+\/[^/]+)/);

    if (githubMatch) {
      const repoPath = githubMatch[1];
      const issuesUrl = `https://github.com/${repoPath}/issues`;

      // Create clickable hyperlink using terminal escape sequences
      const clickableIssues = `\x1b]8;;${issuesUrl}\x1b\\GitHub Issues\x1b]8;;\x1b\\`;

      log.warn(
        `Blueprint looks interesting, but the smith hasn't added executable steps yet. Maybe suggest they add some flows via ${clickableIssues}?`
      );
    } else {
      log.warn(
        "Blueprint looks interesting, but the smith hasn't added executable steps yet. Maybe suggest they add some flows to guide you?"
      );
    }
  }

  private handleBlueprintError(error: Error, isRepository: boolean): void {
    const message = error.message;

    // Check if this is a validation error with our new format
    if (message.includes("[INCOMPLETE]")) {
      // Extract filename from the message and make it clickable
      const filenameMatch = message.match(/\[([^\]]+\.toml)\]/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const coreMessage = message.replace(/\[[^\]]+\.toml\]/, "").trim();
        const sourceUrl = (error as Error & { sourceUrl?: string }).sourceUrl;

        if (sourceUrl) {
          // Create clickable link using terminal escape sequences
          const clickableFilename = `\x1b]8;;${sourceUrl}\x1b\\[${filename}]\x1b]8;;\x1b\\`;
          log.error(`${coreMessage} ${clickableFilename}`);
        } else {
          log.error(message);
        }
      } else {
        log.error(message);
      }
    } else {
      // Fallback for other errors
      const inputType = isRepository ? "repository" : "blueprint";
      log.error(`Error processing ${inputType}: ${message}`);
    }
  }
}
