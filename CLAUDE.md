# Claude CLI Development Guidelines

## CLI Design Principles

This project follows the [Command Line Interface Guidelines](https://github.com/cli-guidelines/cli-guidelines) for creating consistent, user-friendly CLI tools.

## Key Guidelines to Follow

### Design Philosophy

- Follow the principle of least surprise
- Be consistent with existing CLI conventions
- Provide helpful error messages and feedback
- Support both human and machine interaction

### Command Structure

- Use clear, descriptive command names
- Group related commands using subcommands
- Provide sensible defaults
- Make destructive actions explicit and confirmable

### Output Guidelines

- Use color and formatting judiciously
- Provide progress indicators for long operations
- Support different output formats (JSON, table, etc.)
- Respect the user's terminal capabilities

### Error Handling

- Provide actionable error messages
- Use appropriate exit codes
- Suggest corrections when possible
- Include context about what went wrong

### Documentation

- Include built-in help for all commands
- Provide examples in help text
- Maintain consistent terminology
- Include man pages where appropriate

## Commands to Run

### Testing

```bash
npm test
```

### Linting & Type Checking

```bash
npm run lint
npm run typecheck
```

### Building

```bash
npm run build
```

## Development Notes

When implementing new CLI features:

1. Reference the CLI guidelines for best practices
2. Test with various terminal environments
3. Consider accessibility and internationalization
4. Validate user input appropriately
5. Provide clear feedback for all operations
