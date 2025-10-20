import React, { useState } from "react";
import { render, Box, Text, useInput } from "ink";
import { Command } from "@/types/command.js";

export interface CommandOption {
  value: string;
  label: string;
}

interface CommandPaletteProps {
  commands: Map<string, Command>;
  onSelect: (command: string) => void;
}

const CommandPaletteComponent: React.FC<CommandPaletteProps> = ({ commands, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allItems: CommandOption[] = [];

  // Add user-registered commands first
  const uniqueCommands = Array.from(commands.entries()).filter(
    ([name, command]) => name === command.name
  );

  for (const [name, command] of uniqueCommands) {
    const aliases = command.aliases ? ` (${command.aliases.join(", ")})` : "";
    allItems.push({
      value: `/${name}`,
      label: `/${name}${aliases} - ${command.description}`,
    });
  }

  // Add built-in commands
  allItems.push(
    {
      value: "/help",
      label: "/help - Show available commands",
    },
    {
      value: "/clear",
      label: "/clear - Clear the screen",
    },
    {
      value: "/history",
      label: "/history - Show command history",
    },
    {
      value: "/exit",
      label: "/exit - Exit the CLI",
    }
  );

  // Filter items based on search query
  const filteredItems =
    searchQuery.trim() === ""
      ? allItems
      : allItems.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  // Handle keyboard input
  useInput((input, key) => {
    if (key.return) {
      // Enter key - select current item
      if (filteredItems.length > 0) {
        const selected = filteredItems[selectedIndex];
        onSelect(selected.value);
      }
    } else if (key.upArrow) {
      // Move selection up
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      // Move selection down
      setSelectedIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
    } else if (key.backspace || key.delete) {
      // Remove last character from search
      setSearchQuery((prev) => prev.slice(0, -1));
      setSelectedIndex(0);
    } else if (input && !key.ctrl && !key.meta && !key.escape) {
      // Regular character - add to search query
      setSearchQuery((prev) => prev + input);
      setSelectedIndex(0);
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Search input area */}
      <Box>
        <Text color="cyan" bold>
          Search:{" "}
        </Text>
        <Text>{searchQuery}</Text>
        <Text color="cyan">█</Text>
        {searchQuery.trim() !== "" && (
          <Text dimColor>
            {" "}
            ({filteredItems.length} {filteredItems.length === 1 ? "match" : "matches"})
          </Text>
        )}
      </Box>

      {/* Divider */}
      <Box marginY={1}>
        <Text dimColor>{"─".repeat(60)}</Text>
      </Box>

      {/* Helper text */}
      {searchQuery.trim() === "" ? (
        <Box marginBottom={1}>
          <Text dimColor>💡 Type to filter commands, or use ↑↓ arrows to navigate</Text>
        </Box>
      ) : filteredItems.length === 1 ? (
        <Box marginBottom={1}>
          <Text color="green">✓ Press Enter to execute this command</Text>
        </Box>
      ) : null}

      {/* Filtered command list */}
      {filteredItems.length > 0 ? (
        <Box flexDirection="column">
          {filteredItems.map((item, index) => (
            <Box key={item.value} marginBottom={index < filteredItems.length - 1 ? 0 : 0}>
              <Text color={index === selectedIndex ? "cyan" : undefined}>
                {index === selectedIndex ? "❯ " : "  "}
                {item.label}
              </Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text dimColor>No commands found. Try a different search term.</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Show the command palette and return the selected command
 */
export const showCommandPalette = (commands: Map<string, Command>): Promise<string> => {
  return new Promise((resolve) => {
    const handleSelect = (command: string) => {
      // Unmount the Ink component
      unmount();
      // Resolve with the selected command
      resolve(command);
    };

    const { unmount } = render(
      <CommandPaletteComponent commands={commands} onSelect={handleSelect} />
    );
  });
};
