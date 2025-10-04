import { analyser, FSProvider, flatten } from "@specfy/stack-analyser";
import "@specfy/stack-analyser/dist/autoload.js";

export interface TechStack {
  technologies: string[];
  languages: Record<string, number>;
  dependencies: Record<string, string>;
  frameworks: string[];
  scannedAt: string;
  projectPath: string;
}

interface AnalyserNode {
  id: string;
  name: string;
  path: string[];
  tech: string | null;
  edges: unknown[];
  inComponent: string | null;
  childs?: AnalyserNode[];
  techs?: string[];
  languages?: Record<string, number>;
  dependencies?: Array<[string, string, string]>;
  licenses?: unknown[];
  reason?: string[];
}

interface AnalyserResult {
  toJson: () => AnalyserNode;
}

interface FlattenedItem {
  tech?: string;
  name?: string;
}

export class TechStackDetector {
  /**
   * Scan a project directory and detect the tech stack
   */
  static async scan(projectPath: string): Promise<TechStack> {
    const result = await analyser({
      provider: new FSProvider({
        path: projectPath,
      }),
    });

    return this.parseResult(result, projectPath);
  }

  /**
   * Parse the analyser result into a simplified tech stack format
   */
  private static parseResult(result: AnalyserResult, projectPath: string): TechStack {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flat = flatten(result as any) as unknown as FlattenedItem[];
    const json = result.toJson();

    // Extract technologies
    const technologies = new Set<string>();
    const frameworks = new Set<string>();
    const dependencies: Record<string, string> = {};
    const languages: Record<string, number> = {};

    // Helper to process a node
    const processNode = (node: AnalyserNode) => {
      if (!node) return;

      // Extract techs from this node
      if (node.techs && Array.isArray(node.techs)) {
        node.techs.forEach((tech: string) => {
          technologies.add(tech);
          if (this.isFramework(tech)) {
            frameworks.add(tech);
          }
        });
      }

      // Extract languages
      if (node.languages && typeof node.languages === "object") {
        Object.entries(node.languages).forEach(([lang, count]) => {
          languages[lang] = (languages[lang] || 0) + Number(count);
        });
      }

      // Extract dependencies
      if (node.dependencies && Array.isArray(node.dependencies)) {
        node.dependencies.forEach((dep) => {
          if (Array.isArray(dep) && dep.length >= 3) {
            // Format: ["npm", "package-name", "version"]
            const packageName = dep[1];
            const version = dep[2];
            dependencies[packageName] = version;
          }
        });
      }

      // Process children recursively
      if (node.childs && Array.isArray(node.childs)) {
        node.childs.forEach(processNode);
      }
    };

    // Process the root node and all children
    processNode(json);

    // Also process flattened results
    if (Array.isArray(flat)) {
      flat.forEach((item) => {
        if (item.tech) {
          technologies.add(item.tech);
          if (this.isFramework(item.tech)) {
            frameworks.add(item.tech);
          }
        }
      });
    }

    return {
      technologies: Array.from(technologies).sort(),
      languages,
      dependencies,
      frameworks: Array.from(frameworks).sort(),
      scannedAt: new Date().toISOString(),
      projectPath,
    };
  }

  /**
   * Check if a technology is a framework
   */
  private static isFramework(name: string): boolean {
    const frameworks = [
      "react",
      "vue",
      "angular",
      "svelte",
      "next.js",
      "nuxt",
      "express",
      "fastify",
      "nestjs",
      "django",
      "flask",
      "rails",
      "laravel",
      "spring",
      "astro",
      ".net",
    ];

    return frameworks.some((framework) => name.toLowerCase().includes(framework));
  }

  /**
   * Get a summary of the tech stack for display
   */
  static getSummary(techStack: TechStack): string {
    const lines: string[] = [];

    if (techStack.frameworks.length > 0) {
      lines.push(`Frameworks: ${techStack.frameworks.join(", ")}`);
    }

    const topLanguages = Object.entries(techStack.languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang]) => lang);

    if (topLanguages.length > 0) {
      lines.push(`Languages: ${topLanguages.join(", ")}`);
    }

    if (techStack.technologies.length > 0) {
      lines.push(`Technologies: ${techStack.technologies.slice(0, 10).join(", ")}`);
      if (techStack.technologies.length > 10) {
        lines.push(`  ... and ${techStack.technologies.length - 10} more`);
      }
    }

    return lines.join("\n");
  }
}
