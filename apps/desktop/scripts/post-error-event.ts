#!/usr/bin/env node

/**
 * Test script to post a single error event to the NextJS Sniffer ingestion server
 * Usage: npx tsx scripts/post-error-event.ts
 */

const API_BASE = 'http://127.0.0.1:9432';

const errorEvent = {
  ts: new Date().toISOString(),
  phase: 'error' as const,
  method: 'GET',
  url: 'https://api.example.com/test/error',
  status: 500,
  durationMs: 250,
  reqHeaders: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
    'User-Agent': 'Test-Script/1.0',
  },
  resHeaders: {
    'content-type': 'application/json',
  },
  responseBody: {
    error: 'Internal Server Error',
    message: 'Something went wrong on the server',
    code: 'INTERNAL_ERROR',
  },
  errorMessage: 'Test error event - triggered manually',
  service: 'test',
  runtime: 'server',
  traceId: 'test-trace-' + Date.now(),
  requestId: 'test-req-' + Date.now(),
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

    const result = await response.json();
    console.log(`✓ Posted error event: ${event.phase} ${event.method} ${event.url}`);
    console.log(`  Status: ${event.status}`);
    console.log(`  Error: ${event.errorMessage}`);
    console.log(`  Event ID: ${result.id}`);
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
    return true;
  } catch (error: any) {
    console.error(`✗ Server health check failed: ${error.message}`);
    console.error('Make sure the NextJS Sniffer app is running!');
    return false;
  }
}

async function main() {
  console.log('NextJS Sniffer - Error Event Test\n');
  console.log(`Target: ${API_BASE}\n`);

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    process.exit(1);
  }

  console.log('Posting test error event...\n');
  await postEvent(errorEvent);
  console.log('\n✓ Error event posted successfully!');
  console.log('The dock icon should bounce and show a badge if error notifications are enabled.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

