#!/usr/bin/env node
/// <reference types="node" />

/**
 * Post a curl command as an event to Network Sniffer
 * Usage: tsx scripts/post-curl-event.ts
 */

const API_BASE = 'http://127.0.0.1:9432';

const testEvent = {
  ts: new Date().toISOString(),
  phase: 'response' as const,
  method: 'GET',
  url: 'https://api.example.com/v1/orders?status=pending&limit=10',
  status: 200,
  durationMs: 1234,
  reqHeaders: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'x-trace-id': 'trace-' + Date.now(),
    'x-request-id': 'req-' + Date.now(),
    'User-Agent': 'axios/1.8.4',
    'Accept-Encoding': 'gzip, compress, deflate, br',
  },
  resHeaders: {
    'content-type': 'application/json; charset=utf-8',
    'date': new Date().toUTCString(),
    'server': 'nginx/1.20.0',
  },
  responseBody: {
    orders: [
      { id: 1, status: 'pending', total: 99.99 },
      { id: 2, status: 'pending', total: 149.50 },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
    },
  },
  service: 'nextjs',
  runtime: 'server',
  traceId: 'trace-' + Date.now(),
  requestId: 'req-' + Date.now(),
};

async function postEvent() {
  try {
    const response = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✓ Event posted successfully:', result);
  } catch (error: any) {
    console.error('✗ Failed to post event:', error.message);
    process.exit(1);
  }
}

postEvent();

