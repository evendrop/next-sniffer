# Quick Release Instructions

Your app has been built successfully! Here's the easiest way to create your first release:

## Your Release Files Are Ready

Located in: `apps/desktop/release/`
- **NextJS Sniffer-1.0.0-arm64.dmg** - macOS installer (110 MB)
- **latest-mac.yml** - Auto-update metadata

## Create Release on GitHub (5 minutes)

1. **Go to GitHub Releases:**
   https://github.com/evendrop/next-sniffer/releases

2. **Click "Draft a new release"**

3. **Fill in the form:**
   - **Tag:** `v1.0.0` (create new tag if it doesn't exist)
   - **Title:** `v1.0.0 - Initial Release`
   - **Description:**
     ```
     Initial release of NextJS Sniffer
     
     Features:
     - Network request/response inspection
     - Real-time event monitoring via Server-Sent Events
     - Error notifications with dock badge
     - Advanced filtering and search
     - Export events as JSON or cURL
     - Auto-update support
     ```

4. **Upload the DMG file:**
   - Drag and drop: `apps/desktop/release/NextJS Sniffer-1.0.0-arm64.dmg`
   - Or click "attach files" and browse to the file

5. **Click "Publish release"**

## That's It!

Once published:
- Users can download the DMG from the releases page
- The app will automatically check for updates
- Future releases will be detected automatically

## For Future Releases

1. Update version in `package.json`: `"version": "1.0.1"`
2. Run `yarn dist` in `apps/desktop/`
3. Create a new release on GitHub with the new version
4. Upload the new DMG file

## Optional: Set Up SSH Agent (for future git pushes)

If you want to push tags via git in the future:

```bash
# Add your SSH key to the agent (enter password once)
ssh-add ~/.ssh/id_ed25519  # or whatever your key is named

# Then you can push
git push origin v1.0.0
```

Or use HTTPS with a Personal Access Token:
```bash
# Use token as password when prompted
git push origin main
# Username: evendrop
# Password: <paste your GitHub Personal Access Token>
```

