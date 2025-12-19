# Network Sniffer Integration Guide

## Quick Setup

1. Copy `network-sniffer-interceptor.ts` into your Next.js project (e.g., `lib/network-sniffer-interceptor.ts`)

2. Add this single line to your `server-api.ts` file:

```typescript
import { setupNetworkSniffer } from './lib/network-sniffer-interceptor'; // or wherever you put it

// ... your existing code ...

// Create server-side axios instance for auth middleware
export const serverApiClient = axios.create({
    baseURL: AUTH_MIDDLEWARE_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add this ONE line after creating the axios instance:
setupNetworkSniffer(serverApiClient);

// Your existing response interceptor (this still works):
serverApiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        ServerLogger.error('Server API error', {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message
        });
        return Promise.reject(error);
    }
);
```

That's it! All requests/responses will now be logged to the Network Sniffer app.

## Optional Configuration

You can configure the interceptor with environment variables:

```bash
# .env.local or .env
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

## Features

- ✅ Automatically logs all requests, responses, and errors
- ✅ Captures timing, headers, bodies, status codes
- ✅ Redacts sensitive headers (authorization, cookies, API keys)
- ✅ Generates trace/request IDs for request correlation
- ✅ Fire-and-forget (won't slow down or break your API calls)
- ✅ Works alongside existing interceptors
- ✅ Zero impact if Network Sniffer app isn't running

## What Gets Logged

- **Request phase**: Method, URL, headers, body, timestamp
- **Response phase**: Status code, response headers, response body, duration
- **Error phase**: Error message, status code (if available), duration

All events are automatically sent to the Network Sniffer desktop app where you can:
- Filter by method, status, host, time range
- Search by URL or error message
- View full request/response details
- Export events or copy as cURL commands

