import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { preferences } from "./preferences-storage.js";

export interface MissionBriefContext {
  projectName?: string;
  integrationGoal?: string;
  additionalContext?: string;
  blueprintName?: string;
  flowsExecuted?: string[];
  executionSummary?: string;
  agentPrompt?: string; // The blueprint's agent.prompt_template
}

export class MissionBriefGenerator {
  /**
   * Generate a mission brief markdown file content
   */
  static generate(context?: MissionBriefContext): string {
    const techStack = preferences.getTechStack();

    const sections: string[] = [];

    // Header
    sections.push("# Mission Brief: Project Integration");
    sections.push("");
    sections.push(
      "This document contains contextual information about your project to assist with integration tasks."
    );
    sections.push("");
    sections.push(`**Generated:** ${new Date().toLocaleString()}`);
    sections.push("");

    // Project Information
    if (context?.projectName || techStack?.projectPath) {
      sections.push("## Project Information");
      sections.push("");
      if (context?.projectName) {
        sections.push(`**Project Name:** ${context.projectName}`);
      }
      if (techStack?.projectPath) {
        sections.push(`**Project Path:** \`${techStack.projectPath}\``);
      }
      sections.push("");
    }

    // AI Agent Instructions (Most Important - from blueprint)
    if (context?.agentPrompt) {
      sections.push("## Your Mission");
      sections.push("");
      sections.push(context.agentPrompt);
      sections.push("");
    }

    // Integration Goal
    if (context?.integrationGoal) {
      sections.push("## Integration Goal");
      sections.push("");
      sections.push(context.integrationGoal);
      sections.push("");
    }

    // Blueprint Execution Summary
    if (context?.blueprintName || context?.flowsExecuted) {
      sections.push("## What Was Completed");
      sections.push("");
      if (context.blueprintName) {
        sections.push(`**Blueprint:** ${context.blueprintName}`);
      }
      if (context.flowsExecuted && context.flowsExecuted.length > 0) {
        sections.push(`**Flows Executed:** ${context.flowsExecuted.length}`);
        sections.push("");
        sections.push("**Completed Steps:**");
        context.flowsExecuted.forEach((flow, index) => {
          sections.push(`${index + 1}. ${flow}`);
        });
      }
      if (context.executionSummary) {
        sections.push("");
        sections.push("**Summary:**");
        sections.push(context.executionSummary);
      }
      sections.push("");
    }

    // Tech Stack (Contextifact)
    if (techStack) {
      sections.push("## Tech Stack Contextifact");
      sections.push("");
      sections.push(
        "The following technologies, languages, and frameworks were detected in this project:"
      );
      sections.push("");

      // Frameworks
      if (techStack.frameworks.length > 0) {
        sections.push("### Frameworks");
        sections.push("");
        techStack.frameworks.forEach((framework) => {
          sections.push(`- ${framework}`);
        });
        sections.push("");
      }

      // Languages
      if (Object.keys(techStack.languages).length > 0) {
        sections.push("### Languages");
        sections.push("");
        const sortedLanguages = Object.entries(techStack.languages)
          .sort(([, a], [, b]) => b - a)
          .map(([lang, count]) => `- **${lang}** (${count} files)`);
        sections.push(sortedLanguages.join("\n"));
        sections.push("");
      }

      // Technologies
      if (techStack.technologies.length > 0) {
        sections.push("### Technologies");
        sections.push("");
        techStack.technologies.forEach((tech) => {
          sections.push(`- ${tech}`);
        });
        sections.push("");
      }

      // Key Dependencies
      if (Object.keys(techStack.dependencies).length > 0) {
        sections.push("### Key Dependencies");
        sections.push("");
        sections.push("```json");
        const topDependencies = Object.entries(techStack.dependencies)
          .slice(0, 20)
          .reduce(
            (acc, [key, value]) => {
              acc[key] = value;
              return acc;
            },
            {} as Record<string, string>
          );
        sections.push(JSON.stringify(topDependencies, null, 2));
        sections.push("```");
        sections.push("");

        if (Object.keys(techStack.dependencies).length > 20) {
          sections.push(
            `*... and ${Object.keys(techStack.dependencies).length - 20} more dependencies*`
          );
          sections.push("");
        }
      }

      // Scan metadata
      sections.push("### Scan Metadata");
      sections.push("");
      sections.push(`- **Scanned At:** ${new Date(techStack.scannedAt).toLocaleString()}`);
      sections.push(`- **Total Technologies:** ${techStack.technologies.length}`);
      sections.push(`- **Total Dependencies:** ${Object.keys(techStack.dependencies).length}`);
      sections.push("");
    }

    // Additional Context
    if (context?.additionalContext) {
      sections.push("## Additional Context");
      sections.push("");
      sections.push(context.additionalContext);
      sections.push("");
    }

    // General Guidelines (only if no specific agent prompt)
    if (!context?.agentPrompt) {
      sections.push("## Guidelines");
      sections.push("");
      sections.push("When implementing the integration:");
      sections.push("");
      sections.push(
        "1. **Respect the tech stack** - Use the technologies and frameworks listed above"
      );
      sections.push(
        "2. **Follow project conventions** - Match the coding style and patterns in the codebase"
      );
      sections.push("3. **Consider dependencies** - Leverage existing dependencies when possible");
      sections.push(
        "4. **Maintain compatibility** - Ensure new code works with detected language versions"
      );
      sections.push("");
    }

    // Next Steps
    sections.push("## Suggested Next Steps");
    sections.push("");
    sections.push("1. Review the tech stack contextifact above");
    sections.push("2. Identify integration points in the codebase");
    sections.push("3. Plan the integration approach");
    sections.push("4. Implement changes incrementally");
    sections.push("5. Test thoroughly with existing setup");
    sections.push("");

    // Footer
    sections.push("---");
    sections.push("");
    sections.push("*This mission brief was generated by Hacksmith CLI.*");
    sections.push("");

    return sections.join("\n");
  }

  /**
   * Generate a mission brief for a specific integration
   */
  static generateForIntegration(
    productName: string,
    integrationGoal: string,
    additionalContext?: string
  ): string {
    return this.generate({
      projectName: productName,
      integrationGoal,
      additionalContext,
    });
  }

  /**
   * Generate a quick summary for AI context
   */
  static generateQuickSummary(): string {
    const techStack = preferences.getTechStack();
    if (!techStack) {
      return "No tech stack information available. Run `hacksmith preferences scan` first.";
    }

    const summary: string[] = [];
    summary.push("# Project Context Summary");
    summary.push("");

    if (techStack.frameworks.length > 0) {
      summary.push(`**Frameworks:** ${techStack.frameworks.join(", ")}`);
    }

    const topLanguages = Object.entries(techStack.languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([lang]) => lang);

    if (topLanguages.length > 0) {
      summary.push(`**Languages:** ${topLanguages.join(", ")}`);
    }

    if (techStack.technologies.length > 0) {
      summary.push(`**Technologies:** ${techStack.technologies.slice(0, 5).join(", ")}`);
    }

    return summary.join("\n");
  }

  /**
   * Save mission brief to ~/.hacksmith/mission-brief.md
   */
  static save(context?: MissionBriefContext): string {
    const content = this.generate(context);
    const prefsPath = preferences.getPath();
    const briefPath = join(dirname(prefsPath), "mission-brief.md");

    writeFileSync(briefPath, content, "utf-8");
    return briefPath;
  }
}
