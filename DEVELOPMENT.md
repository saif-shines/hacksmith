# Development Guide

## Install

```bash
pnpm install
```

## CLI development

- Link globally for testing:

```bash
pnpm cli:link
```

- Run in watch mode:

```bash
pnpm cli:dev
```

- Run tests:

```bash
pnpm cli:test
pnpm cli:test:watch
```

- Unlink when done:

```bash
pnpm cli:unlink
```

## Release process (Changesets)

1. Create a changeset:

```bash
pnpm changeset
```

2. Commit and push the changeset.
3. On main, CI will open/publish a release PR. To publish locally:

```bash
pnpm version
pnpm release
```

## Website docs

- Dev: `pnpm site:dev`
- Build: `pnpm site:build`
- Preview: `pnpm site:preview`
