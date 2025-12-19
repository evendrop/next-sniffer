export interface Event {
  id: number;
  ts: string;
  ts_ms: number;
  phase: 'request' | 'response' | 'error';
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
  req_headers: Record<string, any> | null;
  res_headers: Record<string, any> | null;
  request_body: any;
  response_body: any;
  error_message: string | null;
  truncated: number;
}

export interface EventFilters {
  search: string;
  methods: string[];
  statusCategory: string;
  phase: string;
  host: string;
  timeRange: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EventsResponse {
  events: Event[];
  pagination: Pagination;
}

