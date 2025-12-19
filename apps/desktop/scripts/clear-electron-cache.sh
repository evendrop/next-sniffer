#!/bin/bash

# Clear Electron cache and restart Dock to refresh icons
# Usage: ./scripts/clear-electron-cache.sh

echo "Clearing Electron cache..."

# Clear Electron cache
rm -rf ~/Library/Caches/electron 2>/dev/null
echo "✓ Cleared ~/Library/Caches/electron"

# Clear Electron app data (be careful - this removes all Electron app data)
# Uncomment if needed:
# rm -rf ~/Library/Application\ Support/Electron 2>/dev/null

# Restart macOS Dock to refresh icons
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Restarting macOS Dock..."
  killall Dock 2>/dev/null
  echo "✓ Dock restarted - icons should refresh"
fi

echo ""
echo "Done! Now restart your Electron app with: yarn dev"
echo ""
echo "Note: In dev mode, the dock name may still show 'Electron' but the icon should update."

