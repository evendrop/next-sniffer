/**
 * Network Sniffer Interceptor for Next.js
 *
 * This file automatically logs all axios requests/responses to the Network Sniffer desktop app.
 *
 * Usage:
 * 1. Import this file in your server-api.ts (or wherever you initialize axios)
 * 2. Call setupNetworkSniffer(serverApiClient) after creating your axios instance
 *
 * Example:
 *   import { setupNetworkSniffer } from './network-sniffer-interceptor';
 *   export const serverApiClient = axios.create({ ... });
 *   setupNetworkSniffer(serverApiClient);
 */

import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const NETWORK_SNIFFER_URL = process.env.NETWORK_SNIFFER_URL;
const ENABLED = process.env.NETWORK_SNIFFER_ENABLED === 'true' && !!NETWORK_SNIFFER_URL;

interface RequestMetadata {
    startTime: number;
    traceId?: string;
    requestId?: string;
}

// Store request metadata for correlation
const requestMetadata = new WeakMap<InternalAxiosRequestConfig, RequestMetadata>();

/**
 * Generate a unique trace/request ID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Send event to Network Sniffer (fire and forget - don't block requests)
 */
async function sendEvent(event: any): Promise<void> {
    if (!ENABLED || !NETWORK_SNIFFER_URL) return;

    try {
        await fetch(NETWORK_SNIFFER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }).catch(() => {
            // Silently fail - Network Sniffer might not be running
            // This prevents errors from affecting the actual API calls
        });
    } catch (error) {
        // Silently fail - don't interfere with actual requests
    }
}

/**
 * Extract trace/request IDs from headers
 */
function extractIds(config: InternalAxiosRequestConfig): { traceId?: string; requestId?: string } {
    const traceId = config.headers?.['x-trace-id'] || config.headers?.['X-Trace-Id'];
    const requestId = config.headers?.['x-request-id'] || config.headers?.['X-Request-Id'];
    return { traceId, requestId };
}

/**
 * Redact sensitive headers before logging
 */
function redactHeaders(headers: any): Record<string, any> {
    if (!headers || typeof headers !== 'object') return {};

    const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
    const redacted: Record<string, any> = {};

    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_HEADERS.some((sensitive) => lowerKey.includes(sensitive))) {
            redacted[key] = '[redacted]';
        } else {
            redacted[key] = value;
        }
    }

    return redacted;
}

/**
 * Build full URL from axios config
 */
function buildUrl(config: InternalAxiosRequestConfig): string {
    const baseURL = config.baseURL || '';
    const url = config.url || '';

    // Handle relative URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Combine baseURL and url
    const fullUrl = baseURL ? `${baseURL}${url}` : url;

    // Add query params if present
    if (config.params) {
        const params = new URLSearchParams(config.params).toString();
        return params ? `${fullUrl}?${params}` : fullUrl;
    }

    return fullUrl;
}

/**
 * Setup Network Sniffer interceptors on an axios instance
 * @param axiosInstance - The axios instance to monitor
 * @param options - Optional configuration
 */
export function setupNetworkSniffer(
    axiosInstance: AxiosInstance,
    options?: {
        service?: string;
        runtime?: string;
    }
): void {
    if (!ENABLED) {
        // Silently return if not enabled - no need to log
        return;
    }

    const service = options?.service || 'nextjs';
    const runtime = options?.runtime || 'server';

    // Request interceptor - log outgoing requests
    axiosInstance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const startTime = Date.now();
            const { traceId, requestId } = extractIds(config);
            const generatedTraceId = traceId || generateId();
            const generatedRequestId = requestId || generateId();

            // Store metadata for response correlation
            requestMetadata.set(config, {
                startTime,
                traceId: generatedTraceId,
                requestId: generatedRequestId
            });

            // Add IDs to headers if not present
            if (!config.headers) {
                config.headers = {} as any;
            }
            if (!config.headers['x-trace-id']) {
                config.headers['x-trace-id'] = generatedTraceId;
            }
            if (!config.headers['x-request-id']) {
                config.headers['x-request-id'] = generatedRequestId;
            }

            // Log request event
            const url = buildUrl(config);
            const requestEvent = {
                ts: new Date().toISOString(),
                phase: 'request' as const,
                method: (config.method || 'GET').toUpperCase(),
                url,
                reqHeaders: redactHeaders(config.headers),
                requestBody: config.data,
                service,
                runtime,
                traceId: generatedTraceId,
                requestId: generatedRequestId
            };

            sendEvent(requestEvent);

            return config;
        },
        (error: AxiosError) => {
            // Log request error
            const config = error.config;
            if (config) {
                const metadata = requestMetadata.get(config);
                const url = buildUrl(config);
                const errorEvent = {
                    ts: new Date().toISOString(),
                    phase: 'error' as const,
                    method: (config.method || 'GET').toUpperCase(),
                    url,
                    reqHeaders: redactHeaders(config.headers),
                    requestBody: config.data,
                    errorMessage: error.message || 'Request failed',
                    service,
                    runtime,
                    traceId: metadata?.traceId,
                    requestId: metadata?.requestId
                };

                sendEvent(errorEvent);
                requestMetadata.delete(config);
            }

            return Promise.reject(error);
        }
    );

    // Response interceptor - log successful responses
    axiosInstance.interceptors.response.use(
        (response: AxiosResponse) => {
            const config = response.config;
            const metadata = requestMetadata.get(config);
            const durationMs = metadata ? Date.now() - metadata.startTime : null;

            const url = buildUrl(config);
            const responseEvent = {
                ts: new Date().toISOString(),
                phase: 'response' as const,
                method: (config.method || 'GET').toUpperCase(),
                url,
                status: response.status,
                durationMs,
                reqHeaders: redactHeaders(config.headers),
                resHeaders: redactHeaders(response.headers),
                requestBody: config.data,
                responseBody: response.data,
                service,
                runtime,
                traceId: metadata?.traceId,
                requestId: metadata?.requestId
            };

            sendEvent(responseEvent);
            requestMetadata.delete(config);

            return response;
        },
        (error: AxiosError) => {
            // Log response/error event
            const config = error.config;
            if (config) {
                const metadata = requestMetadata.get(config);
                const durationMs = metadata ? Date.now() - metadata.startTime : null;

                const url = buildUrl(config);
                const errorEvent = {
                    ts: new Date().toISOString(),
                    phase: 'error' as const,
                    method: (config.method || 'GET').toUpperCase(),
                    url,
                    status: error.response?.status || null,
                    durationMs,
                    reqHeaders: redactHeaders(config.headers),
                    resHeaders: redactHeaders(error.response?.headers),
                    requestBody: config.data,
                    responseBody: error.response?.data,
                    errorMessage: error.message || `HTTP ${error.response?.status || 'Error'}`,
                    service,
                    runtime,
                    traceId: metadata?.traceId,
                    requestId: metadata?.requestId
                };

                sendEvent(errorEvent);
                requestMetadata.delete(config);
            }

            return Promise.reject(error);
        }
    );

    console.log('[Network Sniffer] Interceptor enabled - logging to', NETWORK_SNIFFER_URL);
}
