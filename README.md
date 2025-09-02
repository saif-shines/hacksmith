# Hacksmith

A simple CLI tool. This repository also contains the docs website built with Astro Starlight under `apps/website`.

## Website

- Install deps: `pnpm i`
- Dev: `pnpm site:dev`
- Build: `pnpm site:build`
- Preview: `pnpm site:preview`
- Lint: `pnpm site:lint`
- Format: `pnpm site:format`

### Deploy (Netlify)

- UI: Base dir `apps/website`, Build `pnpm --filter @hacksmith/website build`, Publish `apps/website/dist`
- CLI:

```bash
pnpm dlx netlify-cli init
pnpm dlx netlify-cli deploy --build --prod
```

See `apps/website/README.md` for details.
