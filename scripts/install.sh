#!/bin/bash

# Hacksmith CLI Installer
# Install with: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/hacksmith/main/scripts/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="YOUR_USERNAME/hacksmith"  # TODO: Update with your GitHub username
BINARY_NAME="hacksmith"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${VERSION:-latest}"

# Detect OS and architecture
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    case "$os" in
        darwin*)
            OS="darwin"
            ;;
        linux*)
            OS="linux"
            ;;
        mingw* | msys* | cygwin*)
            OS="windows"
            ;;
        *)
            echo -e "${RED}Unsupported operating system: $os${NC}"
            exit 1
            ;;
    esac

    case "$arch" in
        x86_64 | amd64)
            ARCH="x64"
            ;;
        arm64 | aarch64)
            ARCH="arm64"
            ;;
        *)
            echo -e "${RED}Unsupported architecture: $arch${NC}"
            exit 1
            ;;
    esac

    PLATFORM="${OS}-${ARCH}"
    BINARY_EXT=""

    if [ "$OS" = "windows" ]; then
        BINARY_EXT=".exe"
    fi
}

# Get latest release version from GitHub
get_latest_version() {
    if [ "$VERSION" = "latest" ]; then
        VERSION=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        if [ -z "$VERSION" ]; then
            echo -e "${RED}Failed to fetch latest version${NC}"
            exit 1
        fi
    fi
}

# Download and install binary
install_binary() {
    local download_url="https://github.com/$REPO/releases/download/$VERSION/$BINARY_NAME-$PLATFORM$BINARY_EXT"
    local tmp_file="/tmp/$BINARY_NAME$BINARY_EXT"

    echo -e "${YELLOW}Downloading Hacksmith CLI $VERSION for $PLATFORM...${NC}"

    if ! curl -fsSL -o "$tmp_file" "$download_url"; then
        echo -e "${RED}Failed to download binary from $download_url${NC}"
        echo -e "${YELLOW}Make sure the release exists for your platform${NC}"
        exit 1
    fi

    # Create install directory if it doesn't exist
    mkdir -p "$INSTALL_DIR"

    # Move binary to install directory
    mv "$tmp_file" "$INSTALL_DIR/$BINARY_NAME$BINARY_EXT"
    chmod +x "$INSTALL_DIR/$BINARY_NAME$BINARY_EXT"

    echo -e "${GREEN}✓ Hacksmith CLI installed to $INSTALL_DIR/$BINARY_NAME$BINARY_EXT${NC}"
}

# Check if install directory is in PATH
check_path() {
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        echo -e "${YELLOW}Warning: $INSTALL_DIR is not in your PATH${NC}"
        echo -e "${YELLOW}Add this line to your shell profile (~/.bashrc, ~/.zshrc, etc.):${NC}"
        echo -e "${GREEN}export PATH=\"\$PATH:$INSTALL_DIR\"${NC}"
    fi
}

# Main installation flow
main() {
    echo -e "${GREEN}Hacksmith CLI Installer${NC}"
    echo ""

    detect_platform
    echo -e "Detected platform: ${GREEN}$PLATFORM${NC}"

    get_latest_version
    echo -e "Installing version: ${GREEN}$VERSION${NC}"

    install_binary
    check_path

    echo ""
    echo -e "${GREEN}Installation complete!${NC}"
    echo -e "Run '${GREEN}hacksmith --help${NC}' to get started"
}

main
