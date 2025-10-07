---
title: Testing binaries
description: How to test binary builds and GitHub Actions releases locally
---

This guide covers how to test the Hacksmith CLI release process before publishing.

## Overview

The release process involves:

1. Publishing the npm package (for `npx hacksmith`)
2. Building standalone binaries for all platforms
3. Uploading binaries to GitHub Releases

## Option 1: Test Binary Build Locally (Recommended)

Test the build script to ensure binaries compile correctly:

```bash
# Build all binaries
pnpm build:binaries

# Check if binaries were created
ls -lh dist/binaries/

# Test the binary for your platform
./dist/binaries/hacksmith-darwin-arm64 --help
```

Expected output in `dist/binaries/`:

- `hacksmith-darwin-arm64` (macOS Apple Silicon)
- `hacksmith-darwin-x64` (macOS Intel)
- `hacksmith-linux-x64` (Linux x64)
- `hacksmith-linux-arm64` (Linux ARM64)
- `hacksmith-windows-x64.exe` (Windows)

## Option 2: Test Individual Binary Compilation

Test compilation for a specific platform:

```bash
cd packages/hacksmith

# Build for your current platform
bun build ./src/run.ts --compile --outfile hacksmith-test

# Test the binary
./hacksmith-test --help

# Test with a blueprint
./hacksmith-test plan -b https://github.com/saif-shines/hacksmith-blueprints/blob/main/example.blueprint.toml
```

This is useful for:

- Quick iteration during development
- Testing on specific platforms
- Debugging build issues

## Option 3: Test GitHub Action with `act`

[act](https://github.com/nektos/act) runs GitHub Actions locally using Docker.

### Install act

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (with Chocolatey)
choco install act-cli
```

### Create secrets file

Create `.secrets` file in the repo root (add to `.gitignore`):

```
NPM_PUBLISH_KEY=your_npm_token
HACKSMITH_GITHUB_TOKEN=your_github_token
```

### Run the workflow

```bash
# Test the entire release workflow
act push --secret-file .secrets

# Test only the binary build job
act push --secret-file .secrets -j build-binaries

# Test only the npm publish job
act push --secret-file .secrets -j publish-npm
```

### Limitations

- Requires Docker installed and running
- Large Docker images (~20GB for all platforms)
- Slower than local binary testing
- May not perfectly replicate GitHub's environment

## Option 4: Test with a Pre-release Tag

Create a test release on GitHub without affecting production:

```bash
# Create a pre-release tag
git tag v0.0.7-test
git push origin v0.0.7-test
```

This will trigger the GitHub Action. Monitor progress at:

```
https://github.com/saif-shines/hacksmith/actions
```

### Clean up test release

After testing, delete the test tag and release:

```bash
# Delete local tag
git tag -d v0.0.7-test

# Delete remote tag
git push origin :refs/tags/v0.0.7-test
```

Then manually delete the GitHub Release from the web UI:

1. Go to `https://github.com/YOUR_USERNAME/hacksmith/releases`
2. Find the test release
3. Click "Delete" at the bottom

## Troubleshooting

### Binary build fails

**Error**: `bun: command not found`

**Solution**: Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

### Binary doesn't execute

**Error**: `Permission denied`

**Solution**: Make the binary executable:

```bash
chmod +x ./dist/binaries/hacksmith-darwin-arm64
```

### GitHub Action fails

**Common causes**:

1. Missing secrets (`NPM_PUBLISH_KEY`, `HACKSMITH_GITHUB_TOKEN`)
2. Invalid npm token (needs publish permissions)
3. GitHub token needs `contents: write` permission

**Check secrets**:

1. Go to `https://github.com/YOUR_USERNAME/hacksmith/settings/secrets/actions`
2. Verify both secrets exist
3. Regenerate tokens if needed

### Binary size too large

Bun binaries are ~50MB per platform. This is normal and includes:

- Bun runtime
- Your compiled code
- All dependencies

To reduce size:

- Remove unused dependencies
- Use tree-shaking compatible imports
- Consider compression for distribution

## Best Practices

### Before releasing

1. **Test locally first**: Always run `pnpm build:binaries` before pushing tags
2. **Test the binary**: Run the compiled binary with real blueprints
3. **Check version**: Ensure `package.json` version matches the tag
4. **Review changes**: Use `git diff` to verify all changes

### During release

1. **Use semantic versioning**: Follow `vX.Y.Z` format
2. **Write release notes**: Document changes in GitHub Release
3. **Monitor Actions**: Watch the workflow progress
4. **Test installation**: Use the install script after release

### After release

1. **Verify npm package**: Check `npm view hacksmith version`
2. **Test install script**: Run the curl command on a clean machine
3. **Update documentation**: Document new features
4. **Announce release**: Update README, website, social media

## Release Checklist

- [ ] Run `pnpm build:binaries` locally
- [ ] Test compiled binary with sample blueprints
- [ ] Bump version in `package.json`
- [ ] Update CHANGELOG.md
- [ ] Commit all changes
- [ ] Create and push git tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] Monitor GitHub Actions workflow
- [ ] Verify npm package published
- [ ] Verify GitHub Release created with binaries
- [ ] Test install script: `curl -fsSL ... | bash`
- [ ] Update documentation
- [ ] Announce release
