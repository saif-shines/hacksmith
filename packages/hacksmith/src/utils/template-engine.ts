export type VariableContext = Record<string, unknown>;

export class TemplateEngine {
  /**
   * Interpolate template strings with variables
   * Example: "Hello {{ name }}" with {name: "World"} => "Hello World"
   * Supports nested interpolation (recursively interpolates until no more templates found)
   */
  static interpolate(template: string, context: VariableContext): string {
    let result = template;
    let previousResult = "";
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    // Keep interpolating until no more changes or max iterations reached
    while (result !== previousResult && iterations < maxIterations) {
      previousResult = result;
      result = result.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, path) => {
        const value = this.getNestedValue(context, path.trim());
        return value !== undefined ? String(value) : match;
      });
      iterations++;
    }

    return result;
  }

  /**
   * Interpolate all string values in an object recursively
   */
  static interpolateObject<T>(obj: T, context: VariableContext): T {
    if (typeof obj === "string") {
      return this.interpolate(obj, context) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateObject(item, context)) as T;
    }

    if (obj && typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, context);
      }
      return result as T;
    }

    return obj;
  }

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue({user: {name: "John"}}, "user.name") => "John"
   */
  static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((current: unknown, key: string) => {
      if (current && typeof current === "object") {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   * Example: setNestedValue({}, "user.name", "John") => {user: {name: "John"}}
   */
  static setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split(".");
    const lastKey = keys.pop();

    if (!lastKey) return;

    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Evaluate simple conditional expressions
   * Supports: ==, !=, &&, ||
   * Example: "language == 'node'" with {language: "node"} => true
   */
  static evaluateCondition(condition: string, context: VariableContext): boolean {
    try {
      // First interpolate any variables in the condition
      const interpolated = this.interpolate(condition, context);

      // Simple expression parser for basic comparisons
      // Handles: variable == "value", variable != "value"

      // Check for equality
      const eqMatch = interpolated.match(/^(.+?)\s*==\s*["'](.+?)["']$/);
      if (eqMatch) {
        const [, left, right] = eqMatch;
        const leftValue = this.getNestedValue(context, left.trim());
        return String(leftValue) === right;
      }

      // Check for inequality
      const neqMatch = interpolated.match(/^(.+?)\s*!=\s*["'](.+?)["']$/);
      if (neqMatch) {
        const [, left, right] = neqMatch;
        const leftValue = this.getNestedValue(context, left.trim());
        return String(leftValue) !== right;
      }

      // For simple variable checks (truthy values)
      const value = this.getNestedValue(context, interpolated.trim());
      return Boolean(value);
    } catch {
      // If evaluation fails, default to false (skip the step)
      return false;
    }
  }

  /**
   * Merge multiple variable contexts
   */
  static mergeContexts(...contexts: VariableContext[]): VariableContext {
    return Object.assign({}, ...contexts);
  }

  /**
   * Extract all variable references from a template string
   * Example: "Hello {{ name }} from {{ city }}" => ["name", "city"]
   */
  static extractVariables(template: string): string[] {
    const matches = template.matchAll(/\{\{\s*([^}]+)\s*\}\}/g);
    return Array.from(matches, (m) => m[1].trim());
  }
}
