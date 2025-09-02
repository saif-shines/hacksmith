# Hacksmith Docs Website (@hacksmith/website)

This is a documentation site built with Astro + Starlight.

## Local development

- Install dependencies at repo root:

```bash
pnpm i
```

- Start dev server:

```bash
pnpm site:dev
```

- Build:

```bash
pnpm site:build
```

- Preview:

```bash
pnpm site:preview
```

## Netlify deployment (static)

Use the provided `netlify.toml` at the repository root.

- Base directory: `apps/website`
- Build command: `pnpm --filter @hacksmith/website build`
- Publish directory: `apps/website/dist`
- Node: `20`

### Netlify UI

1. Connect repository in Netlify
2. Configure as above
3. Deploy

### Netlify CLI

```bash
pnpm dlx netlify-cli init
pnpm dlx netlify-cli deploy --build --prod
```

Notes:

- This site is currently static. To enable SSR/Edge in the future, add `@astrojs/netlify` to `astro.config.mjs` and set `output: "server"` per Astro docs.
