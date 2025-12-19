#!/bin/bash

# Generate app icons from SVG for macOS, Windows, and Linux
# Requires: imagemagick (brew install imagemagick on macOS)

ICON_SVG="assets/icon.svg"
ICON_DIR="assets/icons"

mkdir -p "$ICON_DIR"

echo "Generating app icons..."

# Generate PNG sizes needed for .icns (macOS)
sizes=(16 32 64 128 256 512 1024)

for size in "${sizes[@]}"; do
    echo "  Generating ${size}x${size}..."
    convert -background none -resize "${size}x${size}" "$ICON_SVG" "$ICON_DIR/icon_${size}.png"
done

# Create .icns for macOS (requires iconutil or sips)
if command -v iconutil &> /dev/null; then
    echo "Creating macOS .icns file..."
    mkdir -p "$ICON_DIR/icon.iconset"
    
    # Copy and rename for iconutil
    cp "$ICON_DIR/icon_16.png" "$ICON_DIR/icon.iconset/icon_16x16.png"
    cp "$ICON_DIR/icon_32.png" "$ICON_DIR/icon.iconset/icon_16x16@2x.png"
    cp "$ICON_DIR/icon_32.png" "$ICON_DIR/icon.iconset/icon_32x32.png"
    cp "$ICON_DIR/icon_64.png" "$ICON_DIR/icon.iconset/icon_32x32@2x.png"
    cp "$ICON_DIR/icon_128.png" "$ICON_DIR/icon.iconset/icon_128x128.png"
    cp "$ICON_DIR/icon_256.png" "$ICON_DIR/icon.iconset/icon_128x128@2x.png"
    cp "$ICON_DIR/icon_256.png" "$ICON_DIR/icon.iconset/icon_256x256.png"
    cp "$ICON_DIR/icon_512.png" "$ICON_DIR/icon.iconset/icon_256x256@2x.png"
    cp "$ICON_DIR/icon_512.png" "$ICON_DIR/icon.iconset/icon_512x512.png"
    cp "$ICON_DIR/icon_1024.png" "$ICON_DIR/icon.iconset/icon_512x512@2x.png"
    
    iconutil -c icns "$ICON_DIR/icon.iconset" -o "$ICON_DIR/icon.icns"
    rm -rf "$ICON_DIR/icon.iconset"
    echo "✓ Created $ICON_DIR/icon.icns"
fi

# Create .ico for Windows (using 256x256 as base)
if command -v convert &> /dev/null; then
    echo "Creating Windows .ico file..."
    convert "$ICON_DIR/icon_256.png" "$ICON_DIR/icon.ico"
    echo "✓ Created $ICON_DIR/icon.ico"
fi

# Create .png for Linux (512x512)
cp "$ICON_DIR/icon_512.png" "$ICON_DIR/icon.png"
echo "✓ Created $ICON_DIR/icon.png"

echo ""
echo "Icons generated successfully!"
echo "Location: $ICON_DIR/"

