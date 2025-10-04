import terminalLink from "terminal-link";

/**
 * Converts markdown-style links to terminal hyperlinks
 * Supports: [text](url) -> clickable terminal link
 */
export class MarkdownRenderer {
  /**
   * Renders markdown links as terminal hyperlinks
   * @param text - Text containing markdown links like [text](url)
   * @returns Text with terminal hyperlinks
   */
  static renderLinks(text: string): string {
    // Match markdown links: [text](url)
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    return text.replace(linkPattern, (_, linkText, url) => {
      return terminalLink(linkText, url, {
        fallback: (text, url) => `${text} (${url})`,
      });
    });
  }

  /**
   * Renders full markdown text with support for links
   * Can be extended to support more markdown features in the future
   * @param markdown - Markdown text
   * @returns Rendered text for terminal display
   */
  static render(markdown: string): string {
    let rendered = markdown;

    // Render links
    rendered = this.renderLinks(rendered);

    return rendered;
  }
}
