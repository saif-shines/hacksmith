import { stepRegistry } from "./registry.js";
import { infoStepType } from "./info-step.js";
import { navigateStepType } from "./navigate-step.js";
import { inputStepType } from "./input-step.js";
import { choiceStepType } from "./choice-step.js";
import { confirmStepType } from "./confirm-step.js";
import { showCommandsStepType } from "./show-commands-step.js";
import { aiPromptStepType } from "./ai-prompt-step.js";

// Register all step types
stepRegistry.registerAll([
  infoStepType,
  navigateStepType,
  inputStepType,
  choiceStepType,
  confirmStepType,
  showCommandsStepType,
  aiPromptStepType,
]);

// Export registry and types
export { stepRegistry } from "./registry.js";
export { BaseStepType } from "./base-step.js";
export type { StepTypeDefinition, ValidationResult, StepResult } from "./base-step.js";
