import { URL } from 'url';
import { redactHeaders } from './redact.js';

const MAX_BODY_SIZE = 200 * 1024; // 200KB

export interface IncomingEvent {
  ts?: string;
  phase: 'request' | 'response' | 'error';
  method?: string;
  url: string;
  status?: number;
  durationMs?: number;
  reqHeaders?: Record<string, any>;
  resHeaders?: Record<string, any>;
  requestBody?: any;
  responseBody?: any;
  errorMessage?: string;
  service?: string;
  runtime?: string;
  traceId?: string;
  requestId?: string;
}

export interface NormalizedEvent {
  ts: string;
  ts_ms: number;
  phase: string;
  method: string | null;
  url: string;
  host: string | null;
  path: string | null;
  status: number | null;
  duration_ms: number | null;
  service: string | null;
  runtime: string | null;
  trace_id: string | null;
  request_id: string | null;
  req_headers_json: string | null;
  res_headers_json: string | null;
  request_body_json: string | null;
  response_body_json: string | null;
  error_message: string | null;
  truncated: number;
}

function truncateJson(value: any, maxSize: number): { json: string; truncated: boolean } {
  if (value === null || value === undefined) {
    return { json: 'null', truncated: false };
  }

  const jsonStr = JSON.stringify(value);
  if (jsonStr.length <= maxSize) {
    return { json: jsonStr, truncated: false };
  }

  // Try to truncate intelligently
  const truncated = jsonStr.substring(0, maxSize - 50) + '..."[TRUNCATED]';
  return { json: truncated, truncated: true };
}

export function normalizeEvent(event: IncomingEvent): NormalizedEvent {
  const now = new Date();
  const ts = event.ts || now.toISOString();
  const tsDate = new Date(ts);
  const ts_ms = tsDate.getTime();

  // Parse URL
  let host: string | null = null;
  let path: string | null = null;

  try {
    const urlObj = new URL(event.url);
    host = urlObj.host;
    path = urlObj.pathname + urlObj.search;
  } catch (e) {
    // Invalid URL, store as-is
    path = event.url;
  }

  // Redact headers
  const redactedReqHeaders = redactHeaders(event.reqHeaders);
  const redactedResHeaders = redactHeaders(event.resHeaders);

  // Truncate bodies
  const reqBodyResult = truncateJson(event.requestBody, MAX_BODY_SIZE);
  const resBodyResult = truncateJson(event.responseBody, MAX_BODY_SIZE);

  const truncated = (reqBodyResult.truncated || resBodyResult.truncated) ? 1 : 0;

  return {
    ts,
    ts_ms,
    phase: event.phase,
    method: event.method || null,
    url: event.url,
    host,
    path,
    status: event.status ?? null,
    duration_ms: event.durationMs ?? null,
    service: event.service || null,
    runtime: event.runtime || null,
    trace_id: event.traceId || null,
    request_id: event.requestId || null,
    req_headers_json: JSON.stringify(redactedReqHeaders),
    res_headers_json: JSON.stringify(redactedResHeaders),
    request_body_json: reqBodyResult.json,
    response_body_json: resBodyResult.json,
    error_message: event.errorMessage || null,
    truncated,
  };
}

