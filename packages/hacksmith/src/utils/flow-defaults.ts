import type { Flow, OverviewConfig } from "@/types/blueprint.js";
import { generateUniqueId } from "./slugify.js";

/**
 * Generates default id and title for flows that don't have them
 * @param flows - Array of flows to process
 * @param overview - Overview config to derive defaults from
 * @param blueprintName - Optional blueprint name as fallback
 * @returns Array of flows with generated defaults
 */
export function generateFlowDefaults(
  flows: Flow[],
  overview: OverviewConfig,
  blueprintName?: string
): Flow[] {
  // Track existing IDs to avoid collisions
  const existingIds = new Set<string>();

  // First pass: collect existing IDs
  flows.forEach((flow) => {
    if (flow.id) {
      existingIds.add(flow.id);
    }
  });

  // Second pass: generate missing IDs and titles
  return flows.map((flow) => {
    const updatedFlow = { ...flow };

    // Generate ID if missing
    if (!updatedFlow.id) {
      const sourceTitle = overview.title || blueprintName || "main-flow";
      updatedFlow.id = generateUniqueId(sourceTitle, existingIds);
    }

    // Generate title if missing
    if (!updatedFlow.title) {
      updatedFlow.title = overview.title || blueprintName || "Main Flow";
    }

    return updatedFlow;
  });
}

/**
 * Validates that flows have required id and title after auto-generation
 * @param flows - Array of flows to validate
 * @throws Error if any flow is missing required fields
 */
export function validateFlowDefaults(flows: Flow[]): void {
  flows.forEach((flow, index) => {
    if (!flow.id) {
      throw new Error(`Flow at index ${index} is missing required 'id' field`);
    }
    if (!flow.title) {
      throw new Error(`Flow at index ${index} is missing required 'title' field`);
    }
  });
}
