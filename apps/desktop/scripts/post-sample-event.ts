#!/usr/bin/env node

/**
 * Test script to post sample events to the NextJS Sniffer ingestion server
 * Usage: npx tsx scripts/post-sample-event.ts
 */

const API_BASE = 'http://127.0.0.1:9432';

const sampleEvents = [
  {
    ts: new Date().toISOString(),
    phase: 'request' as const,
    method: 'GET',
    url: 'https://api.example.com/users?page=1&limit=10',
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer secret-token-12345',
      'User-Agent': 'Next.js/14.0.0',
    },
    service: 'nextjs',
    runtime: 'server',
    traceId: 'trace-001',
    requestId: 'req-001',
  },
  {
    ts: new Date(Date.now() + 100).toISOString(),
    phase: 'response' as const,
    method: 'GET',
    url: 'https://api.example.com/users?page=1&limit=10',
    status: 200,
    durationMs: 145,
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': '[redacted]',
      'User-Agent': 'Next.js/14.0.0',
    },
    resHeaders: {
      'content-type': 'application/json',
      'x-ratelimit-remaining': '99',
    },
    responseBody: {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
      },
    },
    service: 'nextjs',
    runtime: 'server',
    traceId: 'trace-001',
    requestId: 'req-001',
  },
  {
    ts: new Date(Date.now() + 200).toISOString(),
    phase: 'request' as const,
    method: 'POST',
    url: 'https://api.example.com/users',
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer another-token',
      'X-API-Key': 'api-key-123',
    },
    requestBody: {
      name: 'New User',
      email: 'newuser@example.com',
    },
    service: 'nextjs',
    runtime: 'server',
    traceId: 'trace-002',
    requestId: 'req-002',
  },
  {
    ts: new Date(Date.now() + 350).toISOString(),
    phase: 'response' as const,
    method: 'POST',
    url: 'https://api.example.com/users',
    status: 201,
    durationMs: 234,
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': '[redacted]',
      'X-API-Key': '[redacted]',
    },
    resHeaders: {
      'content-type': 'application/json',
      'location': '/users/123',
    },
    responseBody: {
      id: 123,
      name: 'New User',
      email: 'newuser@example.com',
      createdAt: new Date().toISOString(),
    },
    service: 'nextjs',
    runtime: 'server',
    traceId: 'trace-002',
    requestId: 'req-002',
  },
  {
    ts: new Date(Date.now() + 400).toISOString(),
    phase: 'request' as const,
    method: 'GET',
    url: 'https://api.example.com/users/999',
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token',
    },
    service: 'nextjs',
    runtime: 'server',
    traceId: 'trace-003',
    requestId: 'req-003',
  },
  {
    ts: new Date(Date.now() + 550).toISOString(),
    phase: 'error' as const,
    method: 'GET',
    url: 'https://api.example.com/users/999',
    status: 404,
    durationMs: 150,
    reqHeaders: {
      'Content-Type': 'application/json',
      'Authorization': '[redacted]',
    },
    resHeaders: {
      'content-type': 'application/json',
    },
    responseBody: {
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    },
    errorMessage: 'User with id 999 not found',
    service: 'nextjs',
    runtime: 'server',
    traceId: 'trace-003',
    requestId: 'req-003',
  },
  {
    ts: new Date(Date.now() + 600).toISOString(),
    phase: 'error' as const,
    method: 'POST',
    url: 'https://api.example.com/orders',
    reqHeaders: {
      'Content-Type': 'application/json',
      'Cookie': 'session=abc123',
    },
    requestBody: {
      items: [{ productId: 1, quantity: 2 }],
    },
    errorMessage: 'Request timeout after 5000ms',
    service: 'nextjs',
    runtime: 'server',
    traceId: 'trace-004',
    requestId: 'req-004',
  },
];

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

    const result = await response.json();
    console.log(`✓ Posted event: ${event.phase} ${event.method} ${event.url}`);
    return result;
  } catch (error: any) {
    console.error(`✗ Failed to post event: ${error.message}`);
    throw error;
  }
}

async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    const data = await response.json();
    console.log('✓ Server is healthy:', data);
    return true;
  } catch (error: any) {
    console.error(`✗ Server health check failed: ${error.message}`);
    console.error('Make sure the NextJS Sniffer app is running!');
    return false;
  }
}

async function main() {
  console.log('NextJS Sniffer - Sample Event Emitter\n');
  console.log(`Target: ${API_BASE}\n`);

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    process.exit(1);
  }

  console.log('\nPosting sample events...\n');

  for (const event of sampleEvents) {
    await postEvent(event);
    // Small delay between events
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✓ Successfully posted ${sampleEvents.length} events!`);
  console.log('Check the NextJS Sniffer app to see the events.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

