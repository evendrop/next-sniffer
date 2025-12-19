#!/bin/bash

# Script to fix macOS Gatekeeper issues for unsigned apps
# This removes the quarantine attribute that macOS adds to downloaded files

if [ "$(uname)" != "Darwin" ]; then
    echo "This script is for macOS only."
    exit 1
fi

# Find the app in the release directory
APP_PATH="$(find release -name "*.app" -type d | head -n 1)"

if [ -z "$APP_PATH" ]; then
    echo "Error: Could not find .app bundle in release/ directory"
    echo "Please build the app first with: yarn dist"
    exit 1
fi

echo "Found app: $APP_PATH"
echo "Removing quarantine attribute..."

# Remove quarantine attribute
xattr -dr com.apple.quarantine "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Success! The app should now open without the 'damaged' error."
    echo ""
    echo "You can now:"
    echo "  1. Open the app from Finder"
    echo "  2. Or run: open \"$APP_PATH\""
else
    echo "❌ Failed to remove quarantine attribute"
    exit 1
fi

