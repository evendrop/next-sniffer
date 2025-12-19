#!/usr/bin/env node

/**
 * Post events from a real curl command execution to NextJS Sniffer
 */

const API_BASE = 'http://127.0.0.1:9432';

const startTime = Date.now();
const traceId = 'trace-' + Date.now();
const requestId = 'req-' + Date.now();

// Request event
const requestEvent = {
  ts: new Date(startTime).toISOString(),
  phase: 'request' as const,
  method: 'GET',
  url: 'https://api.example.com/v1/orders?status=pending&limit=10',
  reqHeaders: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'x-trace-id': traceId,
    'x-request-id': requestId,
    'User-Agent': 'axios/1.8.4',
    'Accept-Encoding': 'gzip, compress, deflate, br',
  },
  service: 'nextjs',
  runtime: 'server',
  traceId,
  requestId,
};

// Response event (500 error)
const durationMs = 854; // From curl output
const responseEvent = {
  ts: new Date(startTime + durationMs).toISOString(),
  phase: 'error' as const,
  method: 'GET',
  url: 'https://api.example.com/v1/orders?status=pending&limit=10',
  status: 500,
  durationMs,
  reqHeaders: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'x-trace-id': '[redacted]',
    'x-request-id': '[redacted]',
    'User-Agent': 'axios/1.8.4',
    'Accept-Encoding': 'gzip, compress, deflate, br',
  },
  resHeaders: {
    'content-type': 'text/html; charset=utf-8',
  },
  responseBody: {
    error: 'Internal Server Error',
  },
  errorMessage: 'HTTP 500 - Internal Server Error',
  service: 'nextjs',
  runtime: 'server',
  traceId,
  requestId,
};

async function postEvent(event: any) {
  try {
    const response = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to post event:', error.message);
    throw error;
  }
}

async function main() {
  console.log('Posting request event...');
  const reqResult = await postEvent(requestEvent);
  console.log('✓ Request event posted:', reqResult.id);

  // Small delay to simulate real timing
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log('Posting response event...');
  const resResult = await postEvent(responseEvent);
  console.log('✓ Response event posted:', resResult.id);
  console.log('\nBoth events should now appear in NextJS Sniffer!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

