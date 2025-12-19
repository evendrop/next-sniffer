# NextJS Sniffer

A desktop application for inspecting server-side HTTP events from Next.js backends. The app runs a local HTTP server that receives events from your Next.js application and provides a DevTools-like interface to filter, search, and inspect each request/response.

## Features

- **Local HTTP Server**: Listens on `http://127.0.0.1:9432` for incoming events
- **SQLite Persistence**: All events are stored locally and persist across app restarts
- **Real-time Updates**: New events appear instantly in the UI via Server-Sent Events (SSE)
- **Advanced Filtering**: Filter by method, status code, phase, host, time range, and search text
- **Security**: Automatically redacts sensitive headers (authorization, cookies, API keys)
- **Export & Copy**: Export events as JSON or copy as cURL commands
- **Clean UI**: DevTools-inspired interface with event list and detail viewer

## Tech Stack

- **Electron** + TypeScript
- **React** + Vite + TypeScript
- **Express** (local HTTP server)
- **better-sqlite3** (SQLite database)
- **Server-Sent Events** (real-time updates)

## Installation

1. Install dependencies:

```bash
yarn install
```

2. Build the application:

```bash
yarn build
```

3. Run in development mode:

```bash
yarn dev
```

This will:
- Start the Vite dev server for the React UI
- Launch Electron pointing to the dev server
- Start the ingestion server on port 9432

## Usage

### Starting the App

Run the app in development mode:

```bash
yarn dev
```

### Building for Distribution

Build and package the app for your current platform:

```bash
yarn dist
```

Build for specific platforms:

```bash
yarn dist:mac    # macOS (DMG)
yarn dist:win    # Windows (NSIS installer)
yarn dist:linux  # Linux (AppImage)
```

The packaged apps will be in the `release/` directory.

#### Cross-Platform Building

You can build Windows and Linux installers from macOS:

**Windows builds on macOS:**
1. Install Wine (required for Windows builds):
   ```bash
   brew install --cask wine-stable
   ```
2. Build Windows installer:
   ```bash
   yarn dist:win
   ```

**Linux builds on macOS:**
- Linux builds work without additional dependencies:
  ```bash
  yarn dist:linux
  ```

**Note:** Code signing for Windows requires a Windows environment and certificate. The build will work, but won't be signed when built from macOS.

#### macOS Gatekeeper Issues

If you see a "damaged and can't be opened" error when trying to open the app:

1. **Quick fix** (removes quarantine attribute):
   ```bash
   yarn fix:gatekeeper
   ```

2. **Manual fix**:
   ```bash
   # Find the app bundle
   APP_PATH=$(find release -name "*.app" -type d | head -n 1)
   
   # Remove quarantine attribute
   xattr -dr com.apple.quarantine "$APP_PATH"
   ```

3. **Alternative**: Right-click the app in Finder → "Open" → Click "Open" in the dialog (this adds an exception)

**Note:** For production releases, you should code sign and notarize the app. See [Code Signing](#code-signing) below.

#### Code Signing

For production releases, you should code sign and notarize your macOS app:

1. **Get an Apple Developer certificate** (requires paid Apple Developer account)
2. **Add to `package.json`**:
   ```json
   "mac": {
     "category": "public.app-category.developer-tools",
     "target": "dmg",
     "icon": "assets/icons/icon.icns",
     "hardenedRuntime": true,
     "gatekeeperAssess": false,
     "entitlements": "build/entitlements.mac.plist",
     "entitlementsInherit": "build/entitlements.mac.plist"
   }
   ```

3. **Set environment variables**:
   ```bash
   export CSC_LINK=/path/to/certificate.p12
   export CSC_KEY_PASSWORD=your_password
   export APPLE_ID=your@email.com
   export APPLE_APP_SPECIFIC_PASSWORD=your_app_specific_password
   ```

4. **Build with signing**:
   ```bash
   yarn dist:mac
   ```

See [electron-builder code signing documentation](https://www.electron.build/code-signing) for more details.

### Integrating with Next.js

The easiest way to integrate NextJS Sniffer with your Next.js application is to use the provided interceptor.

#### Step 1: Copy the Interceptor

Copy the interceptor file from this repository to your Next.js project:

```bash
# From your Next.js project root
cp /path/to/next-sniffer/apps/desktop/next-instructions/network-sniffer-interceptor.ts lib/
```

Or manually copy `apps/desktop/next-instructions/network-sniffer-interceptor.ts` to your Next.js project (e.g., `lib/network-sniffer-interceptor.ts`).

#### Step 2: Add to Your Server API Client

In your Next.js server-side API file (e.g., `lib/server-api.ts` or wherever you initialize axios), add just **one line**:

```typescript
import axios from 'axios';
import { setupNetworkSniffer } from './lib/network-sniffer-interceptor';

// Create your axios instance
export const serverApiClient = axios.create({
  baseURL: process.env.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add this ONE line after creating the axios instance:
setupNetworkSniffer(serverApiClient);

// Your existing interceptors still work:
serverApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Your error handling
    return Promise.reject(error);
  }
);
```

That's it! All requests and responses will now be automatically logged to NextJS Sniffer.

#### Step 3: Optional Configuration

You can configure the interceptor via environment variables (add to `.env.local`):

```bash
NETWORK_SNIFFER_URL=http://127.0.0.1:9432/events  # Default
NETWORK_SNIFFER_ENABLED=true  # Set to 'false' to disable (default: true)
```

Or pass options directly:

```typescript
setupNetworkSniffer(serverApiClient, {
  service: 'my-nextjs-app',
  runtime: 'server'
});
```

#### What Gets Logged

The interceptor automatically captures:
- ✅ **Request phase**: Method, URL, headers, body, timestamp
- ✅ **Response phase**: Status code, response headers, response body, duration
- ✅ **Error phase**: Error message, status code (if available), duration
- ✅ **Sensitive data**: Headers are automatically redacted (authorization, cookies, API keys)
- ✅ **Request correlation**: Trace IDs and request IDs for linking related events

All events are sent to the NextJS Sniffer desktop app where you can filter, search, and inspect them.

#### Features

- **Zero impact**: Fire-and-forget logging won't slow down or break your API calls
- **Works alongside existing interceptors**: Doesn't interfere with your current setup
- **Graceful degradation**: If NextJS Sniffer isn't running, requests continue normally
- **Automatic redaction**: Sensitive headers are automatically redacted before logging

For more details, see the [Integration Guide](./next-instructions/INTEGRATION_EXAMPLE.md).

### Testing with Sample Events

A test script is included to post sample events:

```bash
yarn test:emit
```

Or directly:

```bash
npx tsx scripts/post-sample-event.ts
```

Or using curl:

```bash
curl -X POST http://127.0.0.1:9432/events \
  -H "Content-Type: application/json" \
  -d '{
    "ts": "2025-12-19T12:34:56.000Z",
    "phase": "request",
    "method": "GET",
    "url": "https://api.example.com/users",
    "reqHeaders": {
      "Content-Type": "application/json",
      "Authorization": "Bearer token123"
    },
    "service": "nextjs",
    "runtime": "server"
  }'
```

## Event Schema

Events should follow this structure (all fields except `phase` and `url` are optional):

```typescript
{
  ts?: string;                    // ISO timestamp (defaults to now)
  phase: 'request' | 'response' | 'error';
  method?: string;                 // HTTP method (GET, POST, etc.)
  url: string;                     // Full URL
  status?: number;                 // HTTP status code
  durationMs?: number;            // Request duration in milliseconds
  reqHeaders?: Record<string, any>; // Request headers
  resHeaders?: Record<string, any>; // Response headers
  requestBody?: any;               // Request body (will be truncated if > 200KB)
  responseBody?: any;              // Response body (will be truncated if > 200KB)
  errorMessage?: string;          // Error message for error phase
  service?: string;                // Service identifier
  runtime?: string;                // Runtime identifier
  traceId?: string;                // Trace ID for correlation
  requestId?: string;              // Request ID for correlation
}
```

## API Endpoints

The app exposes the following HTTP endpoints:

- `GET /health` - Health check
- `POST /events` - Ingest a new event
- `GET /events` - Get paginated events with filters
- `GET /events/:id` - Get a single event by ID
- `GET /hosts` - Get list of unique hosts
- `POST /clear` - Clear all stored events
- `GET /events/stream` - Server-Sent Events stream for real-time updates

## Database

Events are stored in SQLite at:

- **macOS**: `~/Library/Application Support/Server Network Monitor/monitor.db`
- **Windows/Linux**: Electron userData directory

The database persists across app restarts, so you can review historical events.

## Security

- **Header Redaction**: Sensitive headers (`authorization`, `cookie`, `set-cookie`, `x-api-key`) are automatically redacted before storage
- **Localhost Only**: The server only binds to `127.0.0.1`, not exposing the service on the network
- **Body Size Limits**: Request/response bodies are truncated at 200KB to prevent database bloat

## Port Conflicts

If port 9432 is already in use, the app will display an error message in the UI with instructions. The app will not crash silently.

## Building for Distribution

```bash
yarn dist
```

This will:
1. Build the TypeScript code
2. Build the React UI
3. Package the app using Electron Builder

Outputs:
- **macOS**: DMG in `release/`
- **Windows**: NSIS installer in `release/`
- **Linux**: AppImage in `release/`

## Development

### Project Structure

```
apps/desktop/
├── electron/              # Electron main process
│   ├── main.ts           # Main entry point
│   ├── preload.ts        # Preload script
│   └── server/           # HTTP server
│       ├── index.ts      # Server setup
│       ├── routes.ts     # API routes
│       ├── db.ts         # Database utilities
│       ├── events.ts     # Event normalization
│       ├── redact.ts     # Header redaction
│       └── realtime.ts   # SSE implementation
├── ui/                   # React renderer
│   ├── src/
│   │   ├── App.tsx       # Main app component
│   │   ├── components/   # UI components
│   │   └── lib/          # Utilities and types
│   └── index.html
├── next-instructions/    # Next.js integration files
│   ├── network-sniffer-interceptor.ts  # Ready-to-use interceptor
│   └── INTEGRATION_EXAMPLE.md         # Detailed integration guide
├── scripts/              # Utility scripts
└── package.json
```

## Troubleshooting

### Server won't start

- Check if port 9432 is in use: `lsof -i :9432` (macOS/Linux) or `netstat -ano | findstr :9432` (Windows)
- Close any other applications using port 9432
- Restart the app

### Events not appearing

- Verify the app is running and the server started successfully
- Check the browser console for errors
- Ensure your Next.js app is POSTing to `http://127.0.0.1:9432/events`
- Check the Network tab in DevTools to see if requests are being made

### Database issues

- The database is created automatically on first run
- If you need to reset, close the app and delete the database file
- Database location is shown in the app (via IPC call)

## License

MIT

