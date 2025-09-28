// Base interface for parsed arguments
export interface ParsedArgs {
  help?: boolean;
  h?: boolean;
}

// Plan command specific arguments
export interface PlanArgs extends ParsedArgs {
  blueprint?: string | boolean;
  b?: string | boolean;
  json?: boolean;
  j?: boolean;
}

// Type-safe argument parser result
export type ArgumentParser<T extends ParsedArgs> = {
  parse(args: string[]): T;
  validate(parsed: T): { isValid: boolean; errors: string[] };
};

// Generic argument parser implementation
export function createArgumentParser<T extends ParsedArgs>(): ArgumentParser<T> {
  return {
    parse: (args: string[]): T => {
      const parsed = {} as T;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--")) {
          const key = arg.slice(2) as keyof T;
          const nextArg = args[i + 1];

          if (nextArg && !nextArg.startsWith("-")) {
            parsed[key] = nextArg as T[keyof T];
            i++; // Skip next arg since we consumed it
          } else {
            parsed[key] = true as T[keyof T];
          }
        } else if (arg.startsWith("-")) {
          const key = arg.slice(1) as keyof T;
          const nextArg = args[i + 1];

          if (nextArg && !nextArg.startsWith("-")) {
            parsed[key] = nextArg as T[keyof T];
            i++; // Skip next arg since we consumed it
          } else {
            parsed[key] = true as T[keyof T];
          }
        }
      }

      return parsed;
    },

    validate: (): { isValid: boolean; errors: string[] } => {
      // Base validation - can be extended per command
      return { isValid: true, errors: [] };
    },
  };
}

// Plan command specific parser with validation
export function createPlanArgumentParser(): ArgumentParser<PlanArgs> {
  const baseParser = createArgumentParser<PlanArgs>();

  return {
    ...baseParser,
    validate: (parsed: PlanArgs): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];

      // If blueprint is requested as flag only (true), ensure path is provided
      if (parsed.blueprint === true || parsed.b === true) {
        errors.push("Blueprint path is required when using --blueprint or -b");
      }

      // Validate blueprint path format if provided
      const blueprintPath =
        typeof parsed.blueprint === "string"
          ? parsed.blueprint
          : typeof parsed.b === "string"
            ? parsed.b
            : null;

      if (blueprintPath !== null && blueprintPath.length === 0) {
        errors.push("Blueprint path cannot be empty");
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
  };
}
