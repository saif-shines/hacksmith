<div align="center">

```
 _                _                     _ _   _
| |__   __ _  ___| | _____ _ __ ___  (_) |_| |__
| '_ \ / _` |/ __| |/ / __| '_ ` _ \ | | __| '_ \
| | | | (_| | (__|   <\__ \ | | | | || | |_| | | |
|_| |_|\__,_|\___|_|\_\___/_| |_| |_|/ |\__|_| |_|
                                   |__/
```

**From browsing to building. One command.**

[![npm version](https://img.shields.io/npm/v/hacksmith.svg?style=flat-square)](https://www.npmjs.com/package/hacksmith)
[![npm downloads](https://img.shields.io/npm/dm/hacksmith.svg?style=flat-square)](https://www.npmjs.com/package/hacksmith)
[![CI Status](https://img.shields.io/github/actions/workflow/status/saif-shines/hacksmith/ci.yml?branch=closed-alpha&style=flat-square&label=CI)](https://github.com/saif-shines/hacksmith/actions)
[![License](https://img.shields.io/badge/license-Closed%20Alpha-orange?style=flat-square)](https://github.com/saif-shines/hacksmith/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/saif-shines/hacksmith?style=flat-square&logo=github)](https://github.com/saif-shines/hacksmith)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat-square)](https://github.com/saif-shines/hacksmith/blob/main/CONTRIBUTING.md)

</div>

---

> **⚠️ Alpha Stage Notice:** Hacksmith is currently in closed alpha with a restrictive license that prevents commercial use and redistribution. **Contributions are welcome!** This will transition to a permissive open-source license (MIT/Apache 2.0) upon stable release. [Read the license →](./LICENSE)

---

You know that moment when you find a great new service, read the docs, and think "I'll integrate this later"? Later never comes. The setup is tedious. The docs are scattered. You forget the steps.

Hacksmith fixes that.

It's a CLI that turns integration docs into executable workflows. Someone writes a blueprint once, you run it, answer a few questions, and you're live. No more copy-pasting code snippets, hunting for API keys, or wondering if you missed a step.

## Try it now

```bash
npx hacksmith saif-shines/hacksmith-blueprints
```

That's it. Hacksmith will fetch the blueprint from GitHub and walk you through it. Want to run your own? Use any `owner/repo` combo where you've published blueprints.

## Installation options

Want it installed permanently?

```bash
# Via npm
npm install -g hacksmith

# One-line binary install (no Node.js needed)
curl -fsSL https://raw.githubusercontent.com/saif-shines/hacksmith/main/scripts/install.sh | bash
```

[Full installation guide →](https://thehacksmith.dev/handbooks/installation)

## What can you do with it?

- **Onboard faster**: New team members run a blueprint and get their entire dev environment configured
- **Integrate in minutes**: Add Stripe, Auth0, or any service without reading 47 tabs of documentation
- **Standardize setup**: Your whole team follows the same steps, every time
- **Resume anywhere**: Started on your laptop, interrupted? Pick up where you left off on your desktop

## How it works

1. Someone writes a blueprint (a TOML file defining the workflow)
2. You run it: `npx hacksmith owner/repo`
3. Hacksmith guides you through prompts, runs commands, generates code
4. You're done. Integration live.

Blueprints can live in any GitHub repo. Point Hacksmith at it and go.

## Learn more

- [Documentation](https://thehacksmith.dev)
- [Author your first blueprint](https://thehacksmith.dev/get-started/author-blueprint)
- [See example blueprints](https://github.com/saif-shines/hacksmith-blueprints)

## Contributing

This is a monorepo with the CLI (`packages/hacksmith`) and docs site (`apps/website`).

**Quick start for contributors:**

```bash
# Install dependencies
pnpm install

# Run CLI in dev mode
pnpm dev

# Run the docs site
pnpm site:dev

# Run tests
pnpm test
```

See [`CLAUDE.md`](./CLAUDE.md) for detailed development guidelines.

---

Built by developers who got tired of spending hours on setup that should take minutes.
