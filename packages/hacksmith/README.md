<div align="center">

```
 _                _                     _ _   _
| |__   __ _  ___| | _____ _ __ ___  (_) |_| |__
| '_ \ / _` |/ __| |/ / __| '_ ` _ \ | | __| '_ \
| | | | (_| | (__|   <\__ \ | | | | || | |_| | | |
|_| |_|\__,_|\___|_|\_\___/_| |_| |_|/ |\__|_| |_|
                                   |__/
```

<strong>From browsing to building. One command.</strong>

<a href="https://www.npmjs.com/package/hacksmith"><img src="https://img.shields.io/npm/v/hacksmith.svg" alt="npm version"></a>
<a href="https://www.npmjs.com/package/hacksmith"><img src="https://img.shields.io/npm/dm/hacksmith.svg" alt="npm downloads"></a>
<img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node >=18">
<a href="https://github.com/saif-shines/hacksmith"><img src="https://img.shields.io/badge/GitHub-hacksmith-black?logo=github" alt="GitHub"></a>

</div>

---

Hacksmith turns integration docs into executable workflows. Someone writes a blueprint once; you run it, answer a few questions, and you’re live—without copy‑pasting code or hunting for API keys.

## Try it now

```bash
npx hacksmith saif-shines/hacksmith-blueprints
```

Hacksmith will fetch the blueprint from GitHub and guide you. Publish your own blueprints in any `owner/repo` and point Hacksmith at it.

## Installation

```bash
# Via npm (Node.js >=18)
npm install -g hacksmith

# One‑line binary install (no Node.js required)
curl -fsSL https://raw.githubusercontent.com/saif-shines/hacksmith/main/scripts/install.sh | bash
```

Full guide: https://thehacksmith.dev/handbooks/installation

## Usage

```bash
# Interactive mode
hacksmith

# Load a local blueprint
hacksmith plan --blueprint ./path/to/blueprint.toml

# Load from GitHub (shorthand; auto‑executes unless you pass --no-execute)
hacksmith saif-shines/hacksmith-blueprints

# Configure AI assistant and analyze your tech stack
hacksmith preferences setup
```

## What can you do with it?

- Onboard new engineers with standardized setup
- Integrate services (Stripe, Auth0, etc.) in minutes
- Keep projects consistent with repeatable workflows
- Resume safely with project‑aware sessions and backups

## Learn more

- Docs: https://thehacksmith.dev
- Author your first blueprint: https://thehacksmith.dev/get-started/author-blueprint
- Example blueprints: https://github.com/saif-shines/hacksmith-blueprints
- Issues: https://github.com/saif-shines/hacksmith/issues

## Contributing

This monorepo contains the CLI (`packages/hacksmith`) and the docs site (`apps/website`).

```bash
pnpm install
pnpm dev          # run CLI in dev
pnpm site:dev     # run docs site
pnpm test         # run tests
```
