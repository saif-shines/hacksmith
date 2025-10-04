#!/bin/bash

# Build standalone binaries for all platforms using Bun
# Usage: ./scripts/build-binaries.sh

set -e

echo "Building Hacksmith binaries..."

# Create dist directory for binaries
mkdir -p dist/binaries

cd packages/hacksmith

# Build for macOS (ARM64)
echo "Building for macOS ARM64..."
bun build ./src/run.ts --compile --target=bun-darwin-arm64 --outfile ../../dist/binaries/hacksmith-darwin-arm64

# Build for macOS (x64)
echo "Building for macOS x64..."
bun build ./src/run.ts --compile --target=bun-darwin-x64 --outfile ../../dist/binaries/hacksmith-darwin-x64

# Build for Linux (x64)
echo "Building for Linux x64..."
bun build ./src/run.ts --compile --target=bun-linux-x64 --outfile ../../dist/binaries/hacksmith-linux-x64

# Build for Linux (ARM64)
echo "Building for Linux ARM64..."
bun build ./src/run.ts --compile --target=bun-linux-arm64 --outfile ../../dist/binaries/hacksmith-linux-arm64

# Build for Windows (x64)
echo "Building for Windows x64..."
bun build ./src/run.ts --compile --target=bun-windows-x64 --outfile ../../dist/binaries/hacksmith-windows-x64.exe

cd ../..

echo "✓ Binaries built successfully in dist/binaries/"
ls -lh dist/binaries/
