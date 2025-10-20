---
title: Installation
description: How to install Hacksmith CLI on your system
---

Hacksmith CLI can be installed in multiple ways depending on your needs and environment.

## Quick Install (No Node.js Required)

The fastest way to install Hacksmith without any dependencies:

```bash
curl -fsSL https://raw.githubusercontent.com/saif-shines/hacksmith/main/scripts/install.sh | bash
```

This downloads and installs a standalone binary for your platform (macOS, Linux, or Windows).

### What it does

1. Detects your operating system and CPU architecture
2. Downloads the appropriate binary from GitHub Releases
3. Installs to `~/.local/bin/hacksmith`
4. Makes the binary executable

### Supported Platforms

- macOS: Apple Silicon (ARM64), Intel (x64)
- Linux: x64, ARM64
- Windows: x64

### Custom Installation Directory

By default, the installer uses `~/.local/bin`. To install elsewhere:

```bash
INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/saif-shines/hacksmith/main/scripts/install.sh | bash
```

### Adding to PATH

If `~/.local/bin` is not in your PATH, add this to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export PATH="$PATH:$HOME/.local/bin"
```

Then reload your shell:

```bash
source ~/.bashrc  # or ~/.zshrc
```

## Using npx (Requires Node.js)

Run Hacksmith without installing it permanently:

```bash
npx hacksmith plan -b <blueprint-url>
```

Pros:

- No installation needed
- Always uses latest version
- Quick for one-off usage

Cons:

- Requires Node.js 18+
- Downloads package each time (or uses npm cache)
- Slightly slower startup

## Install via npm (Requires Node.js)

Install globally for persistent use:

```bash
npm install -g hacksmith
```

Or with yarn:

```bash
yarn global add hacksmith
```

Or with pnpm:

```bash
pnpm add -g hacksmith
```

Pros:

- Integrates with Node.js ecosystem
- Easy to update (`npm update -g hacksmith`)
- Familiar for JavaScript developers

Cons:

- Requires Node.js 18+
- Slower startup than binary
- Larger installation size

## Manual Binary Download

Download binaries directly from GitHub Releases:

1. Visit `https://github.com/saif-shines/hacksmith/releases`
2. Download the binary for your platform:
   - macOS ARM64: `hacksmith-darwin-arm64`
   - macOS Intel: `hacksmith-darwin-x64`
   - Linux x64: `hacksmith-linux-x64`
   - Linux ARM64: `hacksmith-linux-arm64`
   - Windows: `hacksmith-windows-x64.exe`
3. Move to a directory in your PATH:

```bash
# macOS/Linux
mv hacksmith-darwin-arm64 /usr/local/bin/hacksmith
chmod +x /usr/local/bin/hacksmith

# Windows (PowerShell as Administrator)
Move-Item hacksmith-windows-x64.exe C:\Windows\System32\hacksmith.exe
```

## Install from Source

For development or custom builds:

```bash
# Clone the repository
git clone https://github.com/saif-shines/hacksmith.git
cd hacksmith

# Install dependencies
pnpm install

# Build the CLI
pnpm cli:build

# Link globally
pnpm cli:link
```

Now you can run `hacksmith` from anywhere.

### Build Custom Binary

Compile your own binary:

```bash
# Build for your platform
cd packages/hacksmith
bun build ./src/run.ts --compile --outfile hacksmith

# Move to PATH
mv hacksmith /usr/local/bin/
```

### Build All Binaries

Build binaries for all platforms:

```bash
pnpm build:binaries
```

Binaries will be in `dist/binaries/`.

## Verify Installation

After installation, verify Hacksmith is available:

```bash
hacksmith --version
```

You should see the version number, for example:

```
0.0.x
```

## Updating

### Update Binary Installation

Re-run the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/saif-shines/hacksmith/main/scripts/install.sh | bash
```

Or specify a version:

```bash
VERSION=v0.0.7 curl -fsSL https://raw.githubusercontent.com/saif-shines/hacksmith/main/scripts/install.sh | bash
```

### Update npm Installation

```bash
npm update -g hacksmith
```

## Uninstalling

### Remove Binary Installation

```bash
rm ~/.local/bin/hacksmith
# or
rm /usr/local/bin/hacksmith
```

### Remove npm Installation

```bash
npm uninstall -g hacksmith
```

### Remove Source Installation

```bash
pnpm cli:unlink
```

## Troubleshooting

### Command not found

Problem: `hacksmith: command not found`

Solutions:

1. Check if binary exists:

```bash
ls -la ~/.local/bin/hacksmith
```

2. Add to PATH:

```bash
export PATH="$PATH:$HOME/.local/bin"
```

3. Verify PATH includes installation directory:

```bash
echo $PATH
```

### Permission denied

Problem: `Permission denied` when running hacksmith

Solution: Make the binary executable:

```bash
chmod +x ~/.local/bin/hacksmith
```

### Download fails

Problem: Install script fails to download binary

Solutions:

1. Check internet connection
2. Verify GitHub is accessible
3. Try manual download from `https://github.com/saif-shines/hacksmith/releases`
4. Check if your platform is supported

### Wrong architecture

Problem: Binary doesn't run (e.g., ARM binary on x64 machine)

Solution: Download the correct binary for your platform:

```bash
# Check your architecture
uname -m

# x86_64 or amd64 → use x64 binary
# arm64 or aarch64 → use arm64 binary
```

### Node.js version mismatch

Problem: `Error: Requires Node.js >=18`

Solutions:

1. Update Node.js:

```bash
# Using nvm
nvm install 18
nvm use 18

# Using Homebrew (macOS)
brew upgrade node
```

2. Or use the standalone binary (no Node.js required):

```bash
curl -fsSL https://raw.githubusercontent.com/saif-shines/hacksmith/main/scripts/install.sh | bash
```

## Comparison

| Method        | Node.js Required | Size  | Startup Speed | Auto-updates |
| ------------- | ---------------- | ----- | ------------- | ------------ |
| Binary (curl) | No               | ~50MB | Fast          | Manual       |
| npx           | Yes (18+)        | ~20MB | Medium        | Automatic    |
| npm global    | Yes (18+)        | ~20MB | Medium        | Manual       |
| From source   | Yes (18+)        | ~20MB | Medium        | Manual       |

## Recommendations

- For end users: Use the curl install script (no dependencies)
- For JavaScript developers: Use npm/npx (familiar workflow)
- For contributors: Install from source (easy development)
- For CI/CD: Use npx (no global installation needed)

## Next Steps

- Quick Start Guide: `/get-started`
- Create Your First Blueprint: `/get-started/author-blueprint`
- Command Reference: `/handbooks/commands`

## Related

- Testing Releases: `/handbooks/testing-releases`
- Contributing Guide: `/handbooks/contribute`
- GitHub Repository: `https://github.com/saif-shines/hacksmith`
