import type { Event, EventsResponse, EventFilters } from './types';

const API_BASE = 'http://127.0.0.1:9432';

export async function fetchEvents(filters: EventFilters, page: number = 1): Promise<EventsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '100',
  });

  if (filters.search) params.append('search', filters.search);
  if (filters.methods.length > 0) params.append('method', filters.methods[0]);
  if (filters.statusCategory && filters.statusCategory !== 'all') {
    params.append('statusCategory', filters.statusCategory);
  }
  if (filters.phase && filters.phase !== 'all') params.append('phase', filters.phase);
  if (filters.host && filters.host !== 'all') params.append('host', filters.host);
  if (filters.timeRange && filters.timeRange !== 'all') {
    params.append('timeRange', filters.timeRange);
  }

  const response = await fetch(`${API_BASE}/events?${params}`);
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
}

export async function fetchEvent(id: number): Promise<Event> {
  const response = await fetch(`${API_BASE}/events/${id}`);
  if (!response.ok) throw new Error('Failed to fetch event');
  return response.json();
}

export async function fetchHosts(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/hosts`);
  if (!response.ok) throw new Error('Failed to fetch hosts');
  return response.json();
}

export async function clearEvents(): Promise<void> {
  const response = await fetch(`${API_BASE}/clear`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to clear events');
}

export function createEventStream(callback: (event: Event) => void): EventSource {
  const eventSource = new EventSource(`${API_BASE}/events/stream`);

  eventSource.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'new-event') {
        callback(data.event);
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  });

  eventSource.addEventListener('error', (e) => {
    console.error('SSE connection error:', e);
    // EventSource will automatically reconnect
  });

  eventSource.addEventListener('open', () => {
    console.log('SSE connection opened');
  });

  return eventSource;
}

export function generateCurlCommand(event: Event): string {
  const method = event.method || 'GET';
  const url = event.url;
  const headers = event.req_headers || {};
  const body = event.request_body;

  let curl = `curl -X ${method}`;

  // Add headers (excluding redacted ones)
  for (const [key, value] of Object.entries(headers)) {
    if (value !== '[redacted]' && !String(value).includes('[redacted]')) {
      curl += ` \\\n  -H "${key}: ${value}"`;
    }
  }

  // Add body if present
  if (body && method !== 'GET' && method !== 'HEAD') {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    curl += ` \\\n  -d '${bodyStr.replace(/'/g, "'\\''")}'`;
  }

  curl += ` \\\n  "${url}"`;

  return curl;
}

