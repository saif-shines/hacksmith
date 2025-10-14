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
    <Box flexDirection="column">
      {/* Search input area */}
      <Box marginBottom={1}>
        <Text color="cyan">Search: </Text>
        <Text>{searchQuery}</Text>
        <Text color="gray">█</Text>
      </Box>

      {/* Filtered command list */}
      {filteredItems.length > 0 ? (
        <Box flexDirection="column">
          {filteredItems.map((item, index) => (
            <Box key={item.value}>
              <Text color={index === selectedIndex ? "cyan" : undefined}>
                {index === selectedIndex ? "❯ " : "  "}
                {item.label}
              </Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Text dimColor>No commands found</Text>
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
