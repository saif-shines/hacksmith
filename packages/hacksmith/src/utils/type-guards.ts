/**
 * Type guard utilities for better type safety
 */

/**
 * Type guard to check if a value is a cancellation symbol from @clack/prompts
 * This is used when users press Ctrl+C or ESC during prompts
 */
export function isCancelled<T>(value: T | symbol): value is symbol {
  return typeof value === "symbol";
}

/**
 * Type guard to check if a value is NOT a cancellation symbol
 * Useful for ensuring we have the actual value
 */
export function isNotCancelled<T>(value: T | symbol): value is T {
  return typeof value !== "symbol";
}
