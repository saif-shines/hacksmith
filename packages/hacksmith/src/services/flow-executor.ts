import { outro, cancel, confirm } from "@clack/prompts";
import type { Flow, FlowStep, BlueprintConfig } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { stepRegistry } from "./step-types/index.js";
import { storage, getBlueprintId } from "@/utils/storage.js";
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
  private devMode: boolean;
  private blueprint?: BlueprintConfig;

  constructor(devMode = false) {
    this.devMode = devMode;
  }

  /**
   * Execute a single flow from a blueprint
   */
  async executeFlow(flow: Flow, blueprint: BlueprintConfig): Promise<FlowExecutionResult> {
    // Store blueprint reference
    this.blueprint = blueprint;

    // Initialize context with blueprint data and load saved variables
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

        // Save variables to storage after each step
        if (this.blueprint) {
          this.saveVariablesToStorage();
        }
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

    // Display overview if enabled
    if (blueprint.overview?.enabled) {
      const shouldContinue = await this.displayOverview(blueprint);
      if (!shouldContinue) {
        cancel("Flow cancelled");
        return {
          success: false,
          cancelled: true,
          variables: {},
        };
      }
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
    return await stepRegistry.execute(step, this.context, this.devMode);
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

    // Add variables with default values
    if (blueprint.variables) {
      context.variables = blueprint.variables;
    }

    // Load and validate saved variables from storage
    const blueprintId = getBlueprintId(blueprint);
    const schemaVersion = blueprint.schema_version || "0.1.0";

    const savedVariables = storage.getValidatedVariables(
      blueprintId,
      schemaVersion,
      blueprint.variables
    );

    if (savedVariables) {
      Object.assign(context, savedVariables);
    }

    return context;
  }

  /**
   * Save variables to storage with version metadata
   */
  private saveVariablesToStorage(): void {
    if (!this.blueprint) return;

    const blueprintId = getBlueprintId(this.blueprint);
    const schemaVersion = this.blueprint.schema_version || "0.1.0";

    // Save user data and interpolated slugs, exclude blueprint config
    const variablesToSave: Record<string, unknown> = {};
    const configKeysToExclude = ["auth", "variables", "schema_version"];

    Object.entries(this.context).forEach(([key, value]) => {
      if (!configKeysToExclude.includes(key)) {
        // Interpolate slugs before saving
        if (key === "slugs" && typeof value === "object" && value !== null) {
          variablesToSave[key] = TemplateEngine.interpolateObject(value, this.context);
        } else {
          variablesToSave[key] = value;
        }
      }
    });

    storage.saveBlueprint(blueprintId, schemaVersion, variablesToSave);
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

  /**
   * Display overview and get user confirmation
   */
  private async displayOverview(blueprint: BlueprintConfig): Promise<boolean> {
    const overview = blueprint.overview;
    if (!overview) return true;

    console.log();

    // Create box top
    const title = overview.title || "Blueprint Overview";
    const boxWidth = Math.max(title.length + 4, 60);
    const leftPadding = Math.floor((boxWidth - title.length) / 2);
    const rightPadding = boxWidth - title.length - leftPadding;

    console.log(chalk.blue("┌" + "─".repeat(boxWidth) + "┐"));
    console.log(
      chalk.blue("│") +
        " ".repeat(leftPadding) +
        chalk.bold.white(title) +
        " ".repeat(rightPadding) +
        chalk.blue("│")
    );
    console.log(chalk.blue("├" + "─".repeat(boxWidth) + "┤"));

    // Estimated time
    if (overview.estimated_time) {
      const timeText = `Estimated time: ${overview.estimated_time}`;
      const timePadding = " ".repeat(boxWidth - timeText.length - 1);
      console.log(chalk.blue("│") + " " + chalk.yellow(timeText) + timePadding + chalk.blue("│"));
      console.log(chalk.blue("│") + " ".repeat(boxWidth) + chalk.blue("│"));
    }

    // Steps
    if (overview.steps && overview.steps.length > 0) {
      const stepsHeader = "This will guide you through:";
      const headerPadding = " ".repeat(boxWidth - stepsHeader.length - 1);
      console.log(
        chalk.blue("│") + " " + chalk.white(stepsHeader) + headerPadding + chalk.blue("│")
      );

      overview.steps.forEach((step, index) => {
        const stepText = `  ${index + 1}. ${step}`;
        const stepPadding = " ".repeat(Math.max(0, boxWidth - stepText.length - 1));
        console.log(chalk.blue("│") + " " + stepText + stepPadding + chalk.blue("│"));
      });
    }

    // Box bottom
    console.log(chalk.blue("└" + "─".repeat(boxWidth) + "┘"));
    console.log();

    // Confirm to proceed
    const response = await confirm({
      message: "Ready to begin?",
      initialValue: true,
    });

    return typeof response === "boolean" && response;
  }
}
