# Creating Your First Release

This guide walks you through creating and publishing your first release of NextJS Sniffer.

## Prerequisites

1. **GitHub Personal Access Token** (required for publishing releases)
2. **Git repository** (already configured: `evendrop/next-sniffer`)

## Step-by-Step Instructions

### Step 1: Create a GitHub Personal Access Token

1. Go to GitHub: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name like: `NextJS Sniffer Releases`
4. Select the **`repo`** scope (this gives full access to repositories)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't be able to see it again!)

### Step 2: Set the Token as Environment Variable

```bash
export GH_TOKEN=your_token_here
```

To make it permanent, add it to your `~/.zshrc` or `~/.bash_profile`:
```bash
echo 'export GH_TOKEN=your_token_here' >> ~/.zshrc
source ~/.zshrc
```

### Step 3: Push Your Code to GitHub

```bash
# Make sure you're on the main branch
git checkout main

# Push your commits
git push -u origin main
```

### Step 4: Create a Git Tag for the Release

```bash
cd apps/desktop

# Create an annotated tag (recommended)
git tag -a v1.0.0 -m "Release v1.0.0 - Initial release"

# Push the tag to GitHub
git push origin v1.0.0
```

**Note:** The version in `package.json` should match your tag (currently `1.0.0`).

### Step 5: Build and Publish the Release

```bash
cd apps/desktop

# Make sure GH_TOKEN is set
echo $GH_TOKEN  # Should show your token

# Build and publish (this will create a GitHub release automatically)
yarn dist
```

This will:
- Build the app for your current platform (macOS, Windows, or Linux)
- Create a GitHub release with tag `v1.0.0`
- Upload the installer files (DMG for macOS, EXE for Windows, AppImage for Linux)
- Generate update metadata files (`latest.yml`, etc.)

### Step 6: Verify the Release

1. Go to: https://github.com/evendrop/next-sniffer/releases
2. You should see a new release `v1.0.0`
3. The release should have installer files attached
4. Users can download and install from there

## For Future Releases

1. **Update version** in `apps/desktop/package.json`:
   ```json
   "version": "1.0.1"
   ```

2. **Commit the version change**:
   ```bash
   git add apps/desktop/package.json
   git commit -m "Bump version to 1.0.1"
   git push
   ```

3. **Create and push a new tag**:
   ```bash
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin v1.0.1
   ```

4. **Build and publish**:
   ```bash
   cd apps/desktop
   yarn dist
   ```

## Troubleshooting

### "GH_TOKEN not found"
- Make sure you've exported the token: `export GH_TOKEN=your_token`
- Check with: `echo $GH_TOKEN`

### "Permission denied" errors
- Make sure your token has the `repo` scope
- Regenerate the token if needed

### "Release already exists"
- Delete the existing release on GitHub
- Or use a new version number

### Building for multiple platforms
- macOS: Build on macOS
- Windows: Build on Windows (or use GitHub Actions)
- Linux: Build on Linux (or use GitHub Actions)

## Cross-Platform Building

To build for all platforms, you can use GitHub Actions or build on each platform:

```bash
# macOS
yarn dist --mac

# Windows
yarn dist --win

# Linux
yarn dist --linux
```

## Auto-Updates

Once you publish a release:
- Users with the app installed will automatically check for updates
- New versions will be detected automatically
- Users can download and install updates from within the app

The app checks for updates:
- On startup
- Every 4 hours while running
- Manually via "Check Updates" button

