import { cancel, confirm, log } from "@clack/prompts";
import type { Flow, FlowStep, BlueprintConfig } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { stepRegistry } from "./step-types/index.js";
import { storage, getBlueprintId } from "@/utils/storage.js";
import { preferences } from "@/utils/preferences-storage.js";
import { MissionBriefGenerator } from "@/utils/mission-brief-generator.js";
import { AIAgentInvoker } from "@/utils/ai-agent-invoker.js";
import { SessionManager } from "@/utils/session-manager.js";
import { ProjectStorage } from "@/utils/project-storage.js";
import { Migration } from "@/utils/migration.js";
import chalk from "chalk";

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
  private sessionManager: SessionManager;
  private projectStorage: ProjectStorage;

  constructor(devMode = false) {
    this.devMode = devMode;
    this.sessionManager = new SessionManager();
    this.projectStorage = new ProjectStorage();
  }

  /**
   * Execute a single flow from a blueprint
   */
  async executeFlow(flow: Flow, blueprint: BlueprintConfig): Promise<FlowExecutionResult> {
    // Store blueprint reference
    this.blueprint = blueprint;

    // Initialize context with blueprint data and load saved variables (if not already initialized)
    if (Object.keys(this.context).length === 0) {
      this.context = this.initializeContext(blueprint);
    }

    log.step(`Let's ${(flow.title || "get started").toLowerCase()}`);

    // Check if we should skip to a specific step based on session state
    const currentSession = this.sessionManager.getCurrentSession();
    let startStepIndex = 0;
    if (currentSession && currentSession.current_flow === (flow.id || flow.title)) {
      startStepIndex = this.sessionManager.shouldSkipToStep(currentSession);
    }

    for (let i = startStepIndex; i < flow.steps.length; i++) {
      const step = flow.steps[i];

      // Check if step should be executed (conditional steps)
      if (step.when && !TemplateEngine.evaluateCondition(step.when, this.context)) {
        continue; // Skip this step
      }

      // Check if navigate step should be skipped (data already exists)
      if (this.shouldSkipNavigate(step, i, flow.steps)) {
        if (this.devMode) {
          // Dev mode: auto-skip
          log.info(
            `${step.title || "Navigation step"} - I found your previous data, so we can skip ahead`
          );
          continue;
        } else {
          // Normal mode: ask user
          const shouldSkip = await confirm({
            message: `I notice we already have this data. Would you like me to skip "${step.title}" and move ahead?`,
            initialValue: true,
          });

          if (typeof shouldSkip === "boolean" && shouldSkip) {
            log.info(`${step.title} - Skipped as requested. Moving forward...`);
            continue;
          }
        }
      }

      // Check if input step should be skipped (already completed)
      if (this.shouldSkipStep(step)) {
        log.info(`${step.title || "This step"} - Already completed! Let's continue.`);
        continue;
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
        log.error(
          `Oops! Something went wrong with "${step.title || step.id}". Let me help you fix this.`
        );
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

        // Update session progress after each step
        this.sessionManager.updateProgress(i, flow.id || flow.title);
      }
    }

    log.success(
      `Great! You've successfully completed ${flow.title || "this integration"}. Let's move on to the next step.`
    );

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
      log.error(
        "I couldn't find any integration steps in this blueprint. Please check that you're using a valid blueprint file."
      );
      return {
        success: false,
        error: "No flows found in blueprint",
        variables: {},
      };
    }

    // Store blueprint reference
    this.blueprint = blueprint;

    // Check for and perform any necessary data migration
    await Migration.checkAndOfferMigration();

    // Check for existing session and prompt for resume/restart
    const sessionResult = await this.sessionManager.checkForExistingSession(blueprint);
    if (sessionResult.cancelled) {
      return {
        success: false,
        cancelled: true,
        variables: {},
      };
    }

    // Initialize context (either fresh or from session)
    this.context = this.initializeContext(blueprint);

    // If resuming, start from the appropriate flow/step
    let startFlowIndex = 0;
    if (sessionResult.shouldResume && sessionResult.sessionState) {
      // Find the flow to resume from
      const resumeFlowId = sessionResult.sessionState.current_flow;
      if (resumeFlowId) {
        const flowIndex = blueprint.flows.findIndex((f) => (f.id || f.title) === resumeFlowId);
        if (flowIndex >= 0) {
          startFlowIndex = flowIndex;
        }
      }
    }

    // Display overview if enabled (defaults to true)
    if (blueprint.overview.enabled !== false) {
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

    // Check if preferences are configured
    if (!preferences.hasAnyPreferences()) {
      const shouldContinue = await this.displayPreferencesPrompt();
      if (!shouldContinue) {
        cancel("Flow cancelled - Please run preferences setup first");
        return {
          success: false,
          cancelled: true,
          variables: {},
        };
      }
    }

    // Show progress summary after confirmations
    const shouldContinue = await this.displayProgressSummary();
    if (!shouldContinue) {
      return {
        success: false,
        cancelled: true,
        variables: {},
      };
    }

    // For now, execute flows sequentially starting from the resume point
    // TODO: Support @clack/prompts group() for parallel flow selection
    for (let i = startFlowIndex; i < blueprint.flows.length; i++) {
      const flow = blueprint.flows[i];

      // Start new session if not resuming
      if (i === startFlowIndex && !sessionResult.shouldResume) {
        this.sessionManager.startSession(blueprint, flow);
      }

      const result = await this.executeFlow(flow, blueprint);

      if (!result.success) {
        return result;
      }

      // Merge flow variables into main context
      this.context = { ...this.context, ...result.variables };

      // Update session progress
      this.sessionManager.updateProgress(i, flow.id || flow.title);
    }

    // Mark session as completed
    this.sessionManager.completeSession();

    // Offer to brief AI agent
    await this.displayAIAgentBriefing();

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

    // Load saved variables from project storage
    const blueprintData = this.projectStorage.getBlueprintData();
    if (blueprintData) {
      Object.assign(context, blueprintData.variables);
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

    this.projectStorage.saveBlueprint(blueprintId, schemaVersion, variablesToSave);
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
    log.success("Done! Here's what we've put together");

    const entries = Object.entries(this.context).filter(
      ([key]) => !["slugs", "auth", "sdk", "variables", "schema_version"].includes(key)
    );

    if (entries.length === 0) {
      log.info("We haven't captured any data yet - that's perfectly fine!");
      return;
    }

    entries.forEach(([key, value]) => {
      const displayValue =
        typeof value === "string" && value.includes("secret") ? "[HIDDEN]" : String(value);

      log.message(`${key}: ${displayValue}`);
    });
  }

  /**
   * Check if a step should be skipped because its data is already captured
   */
  private shouldSkipStep(step: FlowStep): boolean {
    // Only skip input and choice steps that save data
    if (step.type !== "input" && step.type !== "choice") {
      return false;
    }

    // Check single save_to variable
    if (step.save_to) {
      return this.context[step.save_to] !== undefined;
    }

    // Check multiple inputs
    if (step.inputs && step.inputs.length > 0) {
      return step.inputs.every((input) => this.context[input.name] !== undefined);
    }

    return false;
  }

  /**
   * Check if a navigate step should be skipped because captured data already exists
   */
  private shouldSkipNavigate(step: FlowStep, stepIndex: number, allSteps: FlowStep[]): boolean {
    if (step.type !== "navigate") {
      return false;
    }

    // Check explicit captures field
    if (step.captures) {
      const captureVars = Array.isArray(step.captures) ? step.captures : [step.captures];
      return captureVars.every((varName) => this.context[varName] !== undefined);
    }

    // Fallback: look-ahead to next input step (for backward compatibility)
    for (let i = stepIndex + 1; i < allSteps.length; i++) {
      const nextStep = allSteps[i];

      // Stop at next navigate or end
      if (nextStep.type === "navigate") {
        break;
      }

      // Check if this is an input/choice step
      if (nextStep.type === "input" || nextStep.type === "choice") {
        return this.shouldSkipStep(nextStep);
      }
    }

    return false;
  }

  /**
   * Display progress summary of already captured variables and ask about resuming
   */
  private async displayProgressSummary(): Promise<boolean> {
    const capturedVars = Object.entries(this.context).filter(
      ([key]) => !["slugs", "auth", "sdk", "variables", "schema_version"].includes(key)
    );

    if (capturedVars.length === 0) {
      return true; // No progress to show, continue normally
    }

    log.info("Welcome back! I can see you've made progress on this integration.");
    log.message("Here's what we've worked on so far:");

    capturedVars.forEach(([key, value]) => {
      const displayValue =
        typeof value === "string" && value.length > 50
          ? value.substring(0, 47) + "..."
          : String(value);

      // Check if sensitive from blueprint definition or common patterns
      const variableDef = this.blueprint?.variables?.[key];
      const isSensitive =
        variableDef?.sensitive ||
        key.includes("secret") ||
        key.includes("password") ||
        key.includes("token");
      const finalValue = isSensitive ? "[HIDDEN]" : displayValue;

      log.message(`${key}: ${finalValue}`, { symbol: chalk.green("✓") });
    });

    const shouldResume = await confirm({
      message: "Continue from where you left off?",
      initialValue: true,
    });

    if (typeof shouldResume === "boolean" && !shouldResume) {
      // Clear both the context and stored data to truly start fresh
      const blueprintId = getBlueprintId(this.blueprint!);
      storage.deleteBlueprint(blueprintId);
      this.context = this.initializeContext(this.blueprint!);
      log.info("Starting fresh! I've cleared your previous progress.");
      return true;
    }

    return true;
  }

  /**
   * Display preferences prompt and get user confirmation
   */
  private async displayPreferencesPrompt(): Promise<boolean> {
    log.warn("I'd like to help you even better! Let's set up your preferences first.");
    log.message("This quick setup will help me:");
    log.message("• Understand your tech stack to provide better code examples");
    log.message("• Connect with your preferred AI assistant for seamless handoffs");
    log.info("Run 'hacksmith preferences' when you're ready to configure these settings");

    const response = await confirm({
      message: "Would you like to continue without setting up preferences for now?",
      initialValue: false,
    });

    return typeof response === "boolean" && response;
  }

  /**
   * Display AI agent briefing prompt
   */
  private async displayAIAgentBriefing(): Promise<void> {
    log.info("Perfect! I'm ready to brief your AI agent to start executing the integration code.");

    const shouldBrief = await confirm({
      message: "Shall I go ahead and brief your AI assistant?",
      initialValue: true,
    });

    if (typeof shouldBrief === "boolean" && shouldBrief) {
      try {
        // Generate mission brief
        const flowNames = this.blueprint?.flows?.map((flow) => flow.title || "Untitled Flow") || [];
        const blueprintName = this.blueprint?.name || "Unknown Blueprint";
        const blueprintId = getBlueprintId(this.blueprint!);
        const agentPrompt = this.blueprint?.agent?.prompt_template;

        const briefPath = MissionBriefGenerator.save({
          blueprintName,
          blueprintId,
          flowsExecuted: flowNames,
          executionSummary: `Successfully executed ${flowNames.length} flow(s) from ${blueprintName} blueprint.`,
          agentPrompt,
        });

        // Check if AI agent is configured and invoke it
        if (AIAgentInvoker.isConfigured()) {
          const agentName = AIAgentInvoker.getConfiguredAgentName();
          log.info(`Launching ${agentName} with your mission brief...`);

          await AIAgentInvoker.invoke({
            missionBriefPath: briefPath,
            workingDirectory: process.cwd(),
          });
        } else {
          log.success("Mission brief saved successfully!");
          log.info(
            "Your " +
              `\x1b]8;;file://${briefPath}\x1b\\mission brief\x1b]8;;\x1b\\` +
              " contains all the integration details, captured data, and next steps."
          );
          log.info(
            "To enable automatic AI assistant launching, run 'hacksmith preferences' to configure your preferred AI agent."
          );
        }
      } catch (error) {
        log.warn(
          `I couldn't complete the AI agent briefing: ${error instanceof Error ? error.message : String(error)}`
        );
        log.info("You can find your mission brief and context in ~/.hacksmith/mission-brief.md");
      }
    } else {
      log.info("No problem! You can always run this integration again when you're ready.");
    }
  }

  /**
   * Display overview and get user confirmation
   */
  private async displayOverview(blueprint: BlueprintConfig): Promise<boolean> {
    const overview = blueprint.overview;
    if (!overview) return true;

    // Use the static method for rendering the card
    FlowExecutor.renderOverviewCard(blueprint, (message: string) => log.message(message));

    // Confirm to proceed
    const response = await confirm({
      message: "Are you ready to get started with this integration?",
      initialValue: true,
    });

    return typeof response === "boolean" && response;
  }

  static renderOverviewCard(blueprint: BlueprintConfig, outputFn: (message: string) => void): void {
    const overview = blueprint.overview;
    if (!overview) return;

    outputFn("");

    // Create box top
    const title = overview.title || "Blueprint Overview";
    const boxWidth = Math.max(title.length + 4, 60);
    const leftPadding = Math.floor((boxWidth - title.length) / 2);
    const rightPadding = boxWidth - title.length - leftPadding;

    outputFn(chalk.blue("┌" + "─".repeat(boxWidth) + "┐"));
    outputFn(
      chalk.blue("│") +
        " ".repeat(leftPadding) +
        chalk.bold.white(title) +
        " ".repeat(rightPadding) +
        chalk.blue("│")
    );
    outputFn(chalk.blue("├" + "─".repeat(boxWidth) + "┤"));

    // Estimated time
    if (overview.estimated_time) {
      const timeText = `Estimated time: ${overview.estimated_time}`;
      const timePadding = " ".repeat(boxWidth - timeText.length - 1);
      outputFn(chalk.blue("│") + " " + chalk.yellow(timeText) + timePadding + chalk.blue("│"));
      outputFn(chalk.blue("│") + " ".repeat(boxWidth) + chalk.blue("│"));
    }

    // Steps
    if (overview.steps && overview.steps.length > 0) {
      const stepsHeader = "This will guide you through:";
      const headerPadding = " ".repeat(boxWidth - stepsHeader.length - 1);
      outputFn(chalk.blue("│") + " " + chalk.white(stepsHeader) + headerPadding + chalk.blue("│"));

      overview.steps.forEach((step, index) => {
        const stepText = `  ${index + 1}. ${step}`;
        const stepPadding = " ".repeat(Math.max(0, boxWidth - stepText.length - 1));
        outputFn(chalk.blue("│") + " " + stepText + stepPadding + chalk.blue("│"));
      });
    }

    // Box bottom
    outputFn(chalk.blue("└" + "─".repeat(boxWidth) + "┘"));
    outputFn("");
  }
}
