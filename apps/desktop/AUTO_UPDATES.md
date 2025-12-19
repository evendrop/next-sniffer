# Auto-Updates Setup Guide

The NextJS Sniffer app includes automatic update functionality using `electron-updater`. This guide explains how to configure and use it.

## Configuration

### 1. Update package.json

Edit `apps/desktop/package.json` and update the `publish` section in the `build` configuration:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "YOUR_GITHUB_USERNAME",
      "repo": "next-sniffer"
    }
  }
}
```

**Alternative providers:**
- **GitHub** (recommended): Requires GitHub releases
- **S3**: For AWS S3 hosting
- **Generic**: For custom update servers

### 2. GitHub Releases Setup

1. Create a GitHub repository (if you haven't already)
2. Create a GitHub Personal Access Token with `repo` scope
3. Set it as an environment variable:
   ```bash
   export GH_TOKEN=your_token_here
   ```

### 3. Building and Publishing

When you build the app, electron-builder will automatically:
- Create a release on GitHub
- Upload the installer files
- Generate update metadata

```bash
cd apps/desktop
yarn dist
```

This will:
1. Build the app
2. Create installers (DMG, EXE, AppImage)
3. Create a GitHub release (if configured)
4. Upload files to the release

## How It Works

### Automatic Checks

- **On startup**: Checks for updates when the app launches
- **Periodic checks**: Checks every 4 hours while the app is running
- **Manual check**: Users can click "Check Updates" button

### Update Flow

1. **Check**: App checks for updates from the configured provider
2. **Available**: If an update is found, a button appears in the header
3. **Download**: User clicks "Update Available" to download
4. **Install**: After download, user clicks "Install Update" to restart and install

### User Experience

- **Version display**: Current version shown next to app name
- **Update button**: Appears when an update is available
- **Progress indicator**: Shows download progress
- **Toast notifications**: Provides feedback during the update process

## Development Mode

Auto-updates are **disabled** in development mode. The update buttons will show a message that updates are disabled.

## Custom Update Server

If you're not using GitHub, you can set up a custom update server:

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://your-update-server.com/updates"
    }
  }
}
```

Your server needs to serve:
- `latest.yml` (or `latest-mac.yml`, `latest-win.yml`, etc.)
- Installer files (DMG, EXE, AppImage)

See [electron-builder documentation](https://www.electron.build/configuration/publish) for more details.

## Troubleshooting

### Updates not working

1. **Check publish configuration**: Ensure `publish` is correctly set in `package.json`
2. **Check GitHub token**: Make sure `GH_TOKEN` is set if using GitHub
3. **Check version**: Ensure you're incrementing the version in `package.json` for each release
4. **Check network**: Ensure the app can reach the update server

### Version numbering

- Use semantic versioning: `1.0.0`, `1.0.1`, `1.1.0`, etc.
- Always increment the version before building a new release
- The version in `package.json` is used as the release version

## Security

- Updates are verified using code signing (if configured)
- Only signed updates will be installed
- Users are always prompted before installing updates

