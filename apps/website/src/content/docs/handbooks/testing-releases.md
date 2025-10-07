---
title: Testing Hacksmith releases
description: Test binary builds and releases before publishing to ensure everything works correctly
tableOfContents: true
---

Testing releases prevents broken releases and gives you confidence before publishing Hacksmith to users.

## Quick start

**Test locally first** before publishing releases. Local testing catches most issues quickly without affecting users.

```bash
# Build all binaries for your platform
pnpm build:binaries

# Test the binary works
./dist/binaries/hacksmith-darwin-arm64 --help
```

## Release process overview

Hacksmith releases involve three main steps:

1. **Publish npm package** - Makes `npx hacksmith` work for users
2. **Build standalone binaries** - Creates executables for direct download
3. **Upload to GitHub Releases** - Provides download links for users

**Why test first?** Broken releases waste user time and damage trust. Testing catches issues before users encounter them.

## Testing methods

Choose the testing approach that matches your needs:

### Method 1: Local binary testing (fastest)

Build and test binaries on your local machine. **Use this method first** - it catches 90% of issues quickly.

**Build all platform binaries:**

```bash
# Build binaries for all supported platforms
pnpm build:binaries

# See what was created
ls -lh dist/binaries/
```

**Expected files:**

- `hacksmith-darwin-arm64` (Apple Silicon Macs)
- `hacksmith-darwin-x64` (Intel Macs)
- `hacksmith-linux-x64` (Linux computers)
- `hacksmith-linux-arm64` (Raspberry Pi, ARM Linux)
- `hacksmith-windows-x64.exe` (Windows computers)

**Test your platform's binary:**

```bash
# macOS Apple Silicon
./dist/binaries/hacksmith-darwin-arm64 --help

# macOS Intel
./dist/binaries/hacksmith-darwin-x64 --help

# Linux
./dist/binaries/hacksmith-linux-x64 --help

# Windows
./dist/binaries/hacksmith-windows-x64.exe --help
```

**What to check:**

- Binary runs without errors
- Help text displays correctly
- Version number matches your expectations

### Method 2: Individual platform testing (for development)

Test compilation for a single platform during development. **Use this when iterating quickly** on specific platforms.

**Build for your current platform:**

```bash
cd packages/hacksmith

# Compile a test binary
bun build ./src/run.ts --compile --outfile hacksmith-test

# Test basic functionality
./hacksmith-test --help

# Test with a real blueprint
./hacksmith-test plan -b https://github.com/saif-shines/hacksmith-blueprints/blob/main/example.blueprint.toml
```

**When to use this method:**

- **Quick development iteration** - Faster than building all platforms
- **Platform-specific debugging** - Test one platform at a time
- **Build troubleshooting** - Isolate compilation issues

### Method 3: Full workflow testing with act (comprehensive)

Test the complete GitHub Actions workflow locally using [act](https://github.com/nektos/act). **Use this for complete testing** before pushing to production.

**Install act first:**

```bash
# macOS - using Homebrew
brew install act

# Linux - using install script
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows - using Chocolatey
choco install act-cli
```

**Set up authentication:**

Create a `.secrets` file in your repository root (add this file to `.gitignore`):

```
NPM_PUBLISH_KEY=your_npm_token_here
HACKSMITH_GITHUB_TOKEN=your_github_token_here
```

**Run workflow tests:**

```bash
# Test the complete release workflow
act push --secret-file .secrets

# Test only binary building
act push --secret-file .secrets -j build-binaries

# Test only npm publishing
act push --secret-file .secrets -j publish-npm
```

**Trade-offs of using act:**

- **Requires Docker** - Must have Docker installed and running
- **Large storage** - Downloads ~20GB Docker images for all platforms
- **Slower** - Takes longer than local testing
- **Environment differences** - May not exactly match GitHub's setup

### Method 4: Pre-release testing (production-like)

Test releases in a production-like environment before making them public. **Use this for final validation** before releasing to all users.

**Create a test release:**

```bash
# Create a test version tag (use -test or -rc suffix)
git tag v0.0.7-test
git push origin v0.0.7-test
```

**Monitor the release process:**

Watch the GitHub Actions workflow run at:

```
https://github.com/saif-shines/hacksmith/actions
```

**Clean up after testing:**

```bash
# Remove the test tag locally
git tag -d v0.0.7-test

# Remove the test tag from GitHub
git push origin :refs/tags/v0.0.7-test
```

**Remove the test release from GitHub:**

1. Visit `https://github.com/YOUR_USERNAME/hacksmith/releases`
2. Find your test release
3. Click "Delete" at the bottom of the page

## Fix common problems

### Build failures

**Problem:** `bun: command not found` when building binaries.

**Solution:** Install Bun runtime:

```bash
curl -fsSL https://bun.sh/install | bash
```

**Problem:** Binary shows `Permission denied` when trying to run.

**Solution:** Make the binary executable:

```bash
chmod +x ./dist/binaries/hacksmith-darwin-arm64
```

**Problem:** GitHub Actions workflow fails during release.

**Common causes:**

- Missing required secrets (`NPM_PUBLISH_KEY`, `HACKSMITH_GITHUB_TOKEN`)
- NPM token lacks publish permissions
- GitHub token needs `contents: write` permission

**Fix secrets:**

1. Go to `https://github.com/YOUR_USERNAME/hacksmith/settings/secrets/actions`
2. Verify both secrets exist and are correct
3. Regenerate tokens if needed (ensure proper permissions)

### Binary size concerns

**Problem:** Binaries seem too large (~50MB per platform).

**Why this happens:** Bun binaries include:

- The Bun runtime (~40MB)
- Your compiled Hacksmith code
- All project dependencies

**Size reduction options:**

- Remove unused dependencies from `package.json`
- Use tree-shaking compatible imports
- Consider compression for distribution (binaries are already optimized)

## Release best practices

### Before releasing

**Test locally first** - Always build and test binaries before pushing tags:

1. **Build binaries**: Run `pnpm build:binaries` and verify all files created
2. **Test functionality**: Run binary with `--help` and sample blueprints
3. **Check versions**: Ensure `package.json` version matches your intended release
4. **Review changes**: Use `git diff` to verify all intended changes included

### During release

**Monitor and document** the release process:

1. **Use semantic versioning**: Follow `vX.Y.Z` format (e.g., `v1.2.3`)
2. **Write release notes**: Document changes in GitHub Release description
3. **Watch workflow**: Monitor GitHub Actions progress in real-time
4. **Verify installation**: Test the install script works after release

### After releasing

**Verify everything works** for end users:

1. **Check npm package**: Run `npm view hacksmith version` to confirm publication
2. **Test install script**: Run the curl command on a fresh machine
3. **Update documentation**: Add new features to docs and help text
4. **Announce release**: Update README, website, and social channels

## Release checklist

Use this checklist to ensure nothing gets missed:

**Pre-release:**

- [ ] Build binaries locally with `pnpm build:binaries`
- [ ] Test compiled binary with sample blueprints
- [ ] Verify version in `package.json` matches intended release
- [ ] Review all changes with `git diff`
- [ ] Update CHANGELOG.md with new features

**Release:**

- [ ] Create and push git tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] Monitor GitHub Actions workflow progress
- [ ] Verify npm package published correctly
- [ ] Verify GitHub Release created with all binaries
- [ ] Test install script works: `curl -fsSL ... | bash`

**Post-release:**

- [ ] Update documentation with new features
- [ ] Announce release in relevant channels
- [ ] Monitor for any immediate user issues
