const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
]);

export function redactHeaders(headers: Record<string, any> | null | undefined): Record<string, any> {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const redacted: Record<string, any> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(lowerKey)) {
      // If already redacted, preserve it
      if (value === '[redacted]' || (typeof value === 'string' && value.includes('[redacted]'))) {
        redacted[key] = value;
      } else {
        redacted[key] = '[redacted]';
      }
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

