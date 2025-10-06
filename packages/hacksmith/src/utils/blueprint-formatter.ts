import type { BlueprintConfig } from "../types/blueprint.js";

export interface FormattedOutput {
  header: string[];
  sections: Array<{
    title: string;
    content: string[];
  }>;
  json: string;
}

export class BlueprintFormatter {
  static format(blueprint: BlueprintConfig, sourcePath: string): FormattedOutput {
    const header = [
      `📋 Loading blueprint from: ${sourcePath}`,
      "",
      "✅ Successfully parsed blueprint:",
    ];

    const sections: Array<{ title: string; content: string[] }> = [];

    // Basic info section
    const basicInfo = [
      `   Name: ${blueprint.name || "Unnamed"}`,
      `   Version: ${blueprint.version || "Unknown"}`,
      `   Provider: ${blueprint.provider || "Unknown"}`,
    ];

    if (blueprint.description) {
      basicInfo.push(`   Description: ${blueprint.description}`);
    }

    sections.push({ title: "Basic Information", content: basicInfo });

    // Overview section
    if (blueprint.overview?.enabled) {
      const overviewContent = [
        `   Title: ${blueprint.overview.title}`,
        `   Description: ${blueprint.overview.description}`,
        `   Estimated Time: ${blueprint.overview.estimated_time}`,
      ];

      if (blueprint.overview.steps && blueprint.overview.steps.length > 0) {
        overviewContent.push("   Steps:");
        blueprint.overview.steps.forEach((step, index) => {
          overviewContent.push(`     ${index + 1}. ${step}`);
        });
      }

      sections.push({ title: "📋 Overview Configuration", content: overviewContent });
    }

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

    return {
      header,
      sections,
      json: JSON.stringify(blueprint, null, 2),
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

    // Print JSON
    logger("");
    logger("📄 Full Blueprint JSON:");
    formatted.json.split("\n").forEach((line) => logger(line));
  }
}
