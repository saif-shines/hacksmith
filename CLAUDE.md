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
- After you generate the code, see if there's a good opportunity to refactor code for better maintainability

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

### Root Monorepo Commands

#### Development

```bash
# Start CLI development server
pnpm dev

# Start website development server
pnpm site:dev

# Start CLI in watch mode
pnpm cli:watch
```

#### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run CLI tests only
pnpm cli:test

# Run CLI tests in watch mode
pnpm cli:test:watch

# Run all tests across all packages
pnpm test:all
```

#### Building

```bash
# Build all packages
pnpm build:all

# Build CLI only
pnpm cli:build

# Build website only
pnpm site:build
```

#### CLI Package Management

```bash
# Link CLI globally for development
pnpm cli:link

# Unlink CLI globally
pnpm cli:unlink

# Publish CLI package
pnpm cli:publish
```

#### Website Commands

```bash
# Start website development server
pnpm site:dev

# Build website
pnpm site:build

# Preview built website
pnpm site:preview

# Lint website code
pnpm site:lint

# Format website code
pnpm site:format
```

### CLI Package Specific Commands

#### Development

```bash
# Run CLI in development mode
pnpm --filter hacksmith dev

# Build CLI
pnpm --filter hacksmith build

# Build CLI in watch mode
pnpm --filter hacksmith build:watch
```

#### Testing

```bash
# Test CLI (builds first, then runs tests)
pnpm --filter hacksmith test
```

#### Package Management

```bash
# Link CLI globally
pnpm --filter hacksmith link:global

# Unlink CLI globally
pnpm --filter hacksmith unlink:global

# Publish CLI package
pnpm --filter hacksmith publish:np
```

### Available Package Managers

This project supports multiple package managers:

- **pnpm** (primary) - `pnpm` commands
- **npm** - `npm` commands for linking/unlinking
- **bun** - `bun` commands for testing

### Environment Requirements

- **Node.js**: >=18
- **Bun**: >=1.1.0
- **pnpm**: 9.0.0 (specified in packageManager field)

## Automated Lint Checks

This project has automated lint checks that run during git operations:

### Pre-commit Hooks

When you commit code, the following checks run automatically:

```bash
# Pre-commit hook runs:
pnpm exec lint-staged
```

**What lint-staged does:**

- **JavaScript/TypeScript/Astro files** (`*.{js,jsx,ts,tsx,astro}`):
  - Runs `prettier --write` to format code
  - Runs `eslint --fix` to fix linting issues
- **Markdown files** (`*.{md,mdx}`):
  - Runs `prettier --write` to format documentation
- **JSON files** (`*.json`):
  - Runs `prettier --write` to format configuration files

### Commit Message Validation

When you commit, your commit message is validated:

```bash
# Commit message hook runs:
pnpm commitlint --edit "$1"
```

**Commit message format:** Follows [Conventional Commits](https://conventionalcommits.org/) format:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Manual Lint Commands

You can run lint checks manually before committing:

```bash
# Lint all files
pnpm site:lint

# Format all files
pnpm site:format

# Run ESLint directly
npx eslint . --fix

# Run Prettier directly
npx prettier --write .
```

### Bypassing Hooks (Not Recommended)

If you need to bypass the pre-commit hooks (emergency only):

```bash
# Skip pre-commit hooks
git commit --no-verify -m "your message"

# Skip all hooks
git push --no-verify
```

**Note:** Only bypass hooks in emergencies. The automated checks help maintain code quality and consistency.

## Development Notes

When implementing new CLI features:

1. Reference the CLI guidelines for best practices
2. Test with various terminal environments
3. Consider accessibility and internationalization
4. Validate user input appropriately
5. Provide clear feedback for all operations

## AI tools

These are the docs that hacksmith will rely on to trigger an AI agent and intiate integration

- https://docs.claude.com/en/docs/claude-code/cli-reference
