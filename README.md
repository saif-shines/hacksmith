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

## Packages

### Add a dependency to the `hacksmith` package

- Runtime dependency:

  ```bash
  pnpm --filter hacksmith add <package>
  ```

- Dev dependency:

  ```bash
  pnpm --filter hacksmith add -D <package>
  ```

### Add a new package to the monorepo

1. Create the package directory under `packages/` and initialize it.

   ```bash
   mkdir -p packages/<your-package>
   cd packages/<your-package>
   pnpm init -y
   ```

2. Set up `package.json`.
   - Prefer the scope `@hacksmith/<your-package>` for internal libraries.
   - For publishable CLIs or public libs, choose scope/name as appropriate.
   - Ensure the following fields exist (adjust scripts to your stack):

   ```json
   {
     "name": "@hacksmith/<your-package>",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "scripts": {
       "dev": "nodemon src/index.ts",
       "build": "echo 'build'",
       "test": "bun test",
       "publish:np": "pnpm dlx np"
     },
     "engines": {
       "node": ">=18"
     }
   }
   ```

3. Add source files.

   ```bash
   mkdir -p src
   echo "export const hello = () => 'hello';" > src/index.ts
   ```

4. Install dependencies for the new package (scoped to this workspace package).
   - Runtime deps: `pnpm --filter @hacksmith/<your-package> add <dep>`
   - Dev deps: `pnpm --filter @hacksmith/<your-package> add -D <dev-dep>`

   Then make sure the workspace is linked:

   ```bash
   pnpm -w install
   ```

5. Use the new package from another workspace package.

   ```bash
   pnpm --filter <consumer-pkg> add @hacksmith/<your-package>@workspace:*
   ```

6. Build and test via repo scripts (Turbo picks up standard scripts).

   ```bash
   pnpm build:all
   pnpm test:all
   ```

7. (Optional) Publish a public package.
   - In `package.json`, set `"private": false` and ensure a valid name.
   - From the repo root:

   ```bash
   pnpm --filter @hacksmith/<your-package> publish:np
   ```

Notes:

- Workspaces are configured in `pnpm-workspace.yaml` to include `packages/*` and `apps/*`.
- Turbo will cache `build` outputs if your package writes to `dist/` or `build/`.
- Use `pnpm --filter <pkg> <command>` to target any package.
