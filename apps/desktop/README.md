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
npm run dev
```

Or build and package the app:

```bash
npm run dist
```

The packaged app will be in the `release/` directory.

### Posting Events from Next.js

In your Next.js backend, configure axios interceptors to POST events to the NextJS Sniffer:

```typescript
import axios from 'axios';

const networkSnifferUrl = 'http://127.0.0.1:9432/events';

// Request interceptor
axios.interceptors.request.use((config) => {
  const event = {
    ts: new Date().toISOString(),
    phase: 'request',
    method: config.method?.toUpperCase(),
    url: config.url,
    reqHeaders: config.headers,
    requestBody: config.data,
    service: 'nextjs',
    runtime: 'server',
    traceId: config.headers['x-trace-id'],
    requestId: config.headers['x-request-id'],
  };

  // Fire and forget - don't block the request
  fetch(networkSnifferUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(console.error);

  return config;
});

// Response interceptor
axios.interceptors.response.use(
  (response) => {
    const event = {
      ts: new Date().toISOString(),
      phase: 'response',
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      durationMs: Date.now() - (response.config.metadata?.startTime || Date.now()),
      reqHeaders: response.config.headers,
      resHeaders: response.headers,
      requestBody: response.config.data,
      responseBody: response.data,
      service: 'nextjs',
      runtime: 'server',
      traceId: response.config.headers['x-trace-id'],
      requestId: response.config.headers['x-request-id'],
    };

    fetch(networkSnifferUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(console.error);

    return response;
  },
  (error) => {
    const event = {
      ts: new Date().toISOString(),
      phase: 'error',
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      durationMs: error.config?.metadata?.startTime
        ? Date.now() - error.config.metadata.startTime
        : null,
      reqHeaders: error.config?.headers,
      resHeaders: error.response?.headers,
      requestBody: error.config?.data,
      responseBody: error.response?.data,
      errorMessage: error.message,
      service: 'nextjs',
      runtime: 'server',
      traceId: error.config?.headers['x-trace-id'],
      requestId: error.config?.headers['x-request-id'],
    };

    fetch(networkSnifferUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(console.error);

    return Promise.reject(error);
  }
);
```

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

