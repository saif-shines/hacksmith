import type { BlueprintConfig } from "@/types/blueprint.js";
import figures from "figures";

export interface FormattedOutput {
  header: string[];
  sections: Array<{
    title: string;
    content: string[];
  }>;
  json: string;
  showJson: boolean;
}

export class BlueprintFormatter {
  static format(blueprint: BlueprintConfig, sourcePath: string, devMode = false): FormattedOutput {
    // Check if blueprint has no flows or steps
    const hasFlows = blueprint.flows && blueprint.flows.length > 0;
    const hasOverviewSteps = blueprint.overview?.steps && blueprint.overview.steps.length > 0;

    if (!hasFlows && !hasOverviewSteps) {
      return {
        header: [`${figures.warning} Looks like the smith is still authoring the blueprint..`],
        sections: [],
        json: JSON.stringify(blueprint, null, 2),
        showJson: false,
      };
    }

    const header: string[] = [];
    const sections: Array<{ title: string; content: string[] }> = [];

    // Show full details if there are flows OR dev mode
    const showFullDetails = hasFlows || devMode;
    // Show at least overview if there are overview steps
    const showOverview = hasFlows || hasOverviewSteps || devMode;

    if (showFullDetails) {
      // Basic info section
      const basicInfo = [
        `   Name: ${blueprint.name || "Unnamed"}`,
        `   Version: ${blueprint.version || "Unknown"}`,
        `   Provider: ${blueprint.provider || "Unknown"}`,
      ];

      sections.push({ title: "Basic Information", content: basicInfo });
    }

    if (showOverview) {
      // Overview section (now always present since it's required)
      const overviewContent = [];

      if (blueprint.overview.title) {
        overviewContent.push(`   Title: ${blueprint.overview.title}`);
      }

      overviewContent.push(`   Description: ${blueprint.overview.description}`);

      if (blueprint.overview.estimated_time) {
        overviewContent.push(`   Estimated Time: ${blueprint.overview.estimated_time}`);
      }

      if (blueprint.overview.steps && blueprint.overview.steps.length > 0) {
        overviewContent.push("   Steps:");
        blueprint.overview.steps.forEach((step, index) => {
          overviewContent.push(`     ${index + 1}. ${step}`);
        });
      }

      // Only show overview section if enabled is not explicitly false
      if (blueprint.overview.enabled !== false) {
        sections.push({ title: "📋 Overview Configuration", content: overviewContent });
      }
    }

    if (showFullDetails) {
      // Authentication section
      if (blueprint.auth) {
        const authContent: string[] = [];

        if (blueprint.auth.login_url) {
          authContent.push(`   Login URL: ${blueprint.auth.login_url}`);
        }
        if (blueprint.auth.signup_url) {
          authContent.push(`   Signup URL: ${blueprint.auth.signup_url}`);
        }
        if (blueprint.auth.callback_port) {
          authContent.push(`   Callback Port: ${blueprint.auth.callback_port}`);
        }
        if (blueprint.auth.callback_path) {
          authContent.push(`   Callback Path: ${blueprint.auth.callback_path}`);
        }

        if (authContent.length > 0) {
          sections.push({ title: "🔐 Authentication Configuration", content: authContent });
        }
      }

      // Variables section
      if (blueprint.variables && Object.keys(blueprint.variables).length > 0) {
        const variableContent = ["   Required Variables:"];
        Object.entries(blueprint.variables).forEach(([key, config]) => {
          const required = config.required ? "(required)" : "(optional)";
          const sensitive = config.sensitive ? "🔒" : "";
          variableContent.push(
            `     • ${key} ${sensitive} ${required}: ${config.description || "No description"}`
          );
        });

        sections.push({ title: "📝 Variables", content: variableContent });
      }
    }

    return {
      header,
      sections,
      json: JSON.stringify(blueprint, null, 2),
      showJson: showFullDetails,
    };
  }

  static print(formatted: FormattedOutput, logger: (message: string) => void): void {
    // Print header
    formatted.header.forEach((line) => logger(line));

    // Print sections
    formatted.sections.forEach((section) => {
      logger(""); // Empty line
      logger(section.title);
      section.content.forEach((line) => logger(line));
    });

    // Only print JSON if showJson flag is true
    if (formatted.showJson) {
      logger("");
      logger("📄 Full Blueprint JSON:");
      formatted.json.split("\n").forEach((line) => logger(line));
    }
  }
}
