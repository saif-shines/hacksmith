import { outro, cancel } from "@clack/prompts";
import type { Flow, FlowStep, BlueprintConfig } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { stepRegistry } from "./step-types/index.js";
import chalk from "chalk";
import figures from "figures";

export interface FlowExecutionResult {
  success: boolean;
  variables: VariableContext;
  cancelled?: boolean;
  error?: string;
}

export class FlowExecutor {
  private context: VariableContext = {};

  /**
   * Execute a single flow from a blueprint
   */
  async executeFlow(flow: Flow, blueprint: BlueprintConfig): Promise<FlowExecutionResult> {
    // Initialize context with blueprint data
    this.context = this.initializeContext(blueprint);

    console.log(chalk.cyan.bold(`\n${figures.pointer} ${flow.title}\n`));

    for (const step of flow.steps) {
      // Check if step should be executed (conditional steps)
      if (step.when && !TemplateEngine.evaluateCondition(step.when, this.context)) {
        continue; // Skip this step
      }

      const result = await this.executeStep(step);

      if (result.cancelled) {
        cancel("Flow cancelled");
        return {
          success: false,
          cancelled: true,
          variables: this.context,
        };
      }

      if (!result.success) {
        return {
          success: false,
          error: `Step ${step.id} failed`,
          variables: this.context,
        };
      }

      // Merge step variables into context
      if (result.variables) {
        this.context = { ...this.context, ...result.variables };
      }
    }

    outro(chalk.green(`${figures.tick} ${flow.title} completed!`));

    return {
      success: true,
      variables: this.context,
    };
  }

  /**
   * Execute multiple flows from a blueprint
   */
  async executeFlows(blueprint: BlueprintConfig): Promise<FlowExecutionResult> {
    if (!blueprint.flows || blueprint.flows.length === 0) {
      return {
        success: false,
        error: "No flows found in blueprint",
        variables: {},
      };
    }

    // For now, execute flows sequentially
    // TODO: Support @clack/prompts group() for parallel flow selection
    for (const flow of blueprint.flows) {
      const result = await this.executeFlow(flow, blueprint);

      if (!result.success) {
        return result;
      }

      // Merge flow variables into main context
      this.context = { ...this.context, ...result.variables };
    }

    return {
      success: true,
      variables: this.context,
    };
  }

  /**
   * Execute a single step based on its type
   */
  private async executeStep(step: FlowStep): Promise<{
    success: boolean;
    variables?: VariableContext;
    cancelled?: boolean;
    error?: string;
  }> {
    return await stepRegistry.execute(step, this.context);
  }

  /**
   * Initialize context with blueprint data
   */
  private initializeContext(blueprint: BlueprintConfig): VariableContext {
    const context: VariableContext = {};

    // Add blueprint metadata
    if (blueprint.schema_version) {
      context.schema_version = blueprint.schema_version;
    }

    // Add slugs to context
    if (blueprint.slugs) {
      context.slugs = blueprint.slugs;
    }

    // Add auth config
    if (blueprint.auth) {
      context.auth = blueprint.auth;
    }

    // Add SDK config
    if (blueprint.sdk) {
      context.sdk = blueprint.sdk;
    }

    // Add variables with default values
    if (blueprint.variables) {
      context.variables = blueprint.variables;
    }

    return context;
  }

  /**
   * Get the current execution context
   */
  getContext(): VariableContext {
    return { ...this.context };
  }

  /**
   * Display flow summary
   */
  displaySummary(): void {
    console.log(chalk.cyan.bold("\n📋 Flow Summary\n"));

    const entries = Object.entries(this.context).filter(
      ([key]) => !["slugs", "auth", "sdk", "variables", "schema_version"].includes(key)
    );

    if (entries.length === 0) {
      console.log(chalk.gray("No variables captured"));
      return;
    }

    entries.forEach(([key, value]) => {
      const displayValue =
        typeof value === "string" && value.includes("secret") ? "[HIDDEN]" : String(value);

      console.log(`  ${chalk.yellow(key)}: ${displayValue}`);
    });

    console.log();
  }
}
