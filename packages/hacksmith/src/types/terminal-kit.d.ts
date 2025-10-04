declare module "terminal-kit" {
  export interface Terminal {
    clear(): void;
    moveTo(x: number, y: number): void;
    terminal: Terminal; // The actual terminal instance
    // Add other methods as needed
  }

  const terminal: Terminal;
  export default terminal;
}
