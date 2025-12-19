import { Express, Request, Response } from 'express';
import { getDb } from './db.js';
import { normalizeEvent, IncomingEvent } from './events.js';
import { broadcastEvent } from './realtime.js';

export function setupRoutes(app: Express) {
  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Ingest event
  app.post('/events', (req: Request, res: Response) => {
    try {
      const event = req.body as IncomingEvent;
      const normalized = normalizeEvent(event);

      const db = getDb();
      const stmt = db.prepare(`
        INSERT INTO events (
          ts, ts_ms, phase, method, url, host, path, status, duration_ms,
          service, runtime, trace_id, request_id,
          req_headers_json, res_headers_json,
          request_body_json, response_body_json,
          error_message, truncated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        normalized.ts,
        normalized.ts_ms,
        normalized.phase,
        normalized.method,
        normalized.url,
        normalized.host,
        normalized.path,
        normalized.status,
        normalized.duration_ms,
        normalized.service,
        normalized.runtime,
        normalized.trace_id,
        normalized.request_id,
        normalized.req_headers_json,
        normalized.res_headers_json,
        normalized.request_body_json,
        normalized.response_body_json,
        normalized.error_message,
        normalized.truncated
      );

      const insertedId = result.lastInsertRowid;

      // Broadcast to SSE clients (parse JSON fields like GET /events does)
      const broadcastData = {
        id: insertedId,
        ...normalized,
        req_headers: normalized.req_headers_json ? JSON.parse(normalized.req_headers_json) : null,
        res_headers: normalized.res_headers_json ? JSON.parse(normalized.res_headers_json) : null,
        request_body: normalized.request_body_json ? JSON.parse(normalized.request_body_json) : null,
        response_body: normalized.response_body_json ? JSON.parse(normalized.response_body_json) : null,
      };
      // Remove the _json fields from broadcast
      delete (broadcastData as any).req_headers_json;
      delete (broadcastData as any).res_headers_json;
      delete (broadcastData as any).request_body_json;
      delete (broadcastData as any).response_body_json;

      broadcastEvent(broadcastData);

      res.json({ id: insertedId, success: true });
    } catch (error: any) {
      console.error('Error ingesting event:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get events with filters
  app.get('/events', (req: Request, res: Response) => {
    try {
      const {
        page = '1',
        limit = '100',
        method,
        status,
        phase,
        host,
        search,
        statusCategory,
        timeRange,
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const db = getDb();
      let query = 'SELECT * FROM events WHERE 1=1';
      const params: any[] = [];

      // Time range filter
      if (timeRange) {
        const now = Date.now();
        let timeMs = 0;
        switch (timeRange) {
          case '15m':
            timeMs = now - 15 * 60 * 1000;
            break;
          case '1h':
            timeMs = now - 60 * 60 * 1000;
            break;
          case '24h':
            timeMs = now - 24 * 60 * 60 * 1000;
            break;
        }
        if (timeMs > 0) {
          query += ' AND ts_ms >= ?';
          params.push(timeMs);
        }
      }

      // Method filter
      if (method) {
        query += ' AND method = ?';
        params.push(method);
      }

      // Phase filter
      if (phase) {
        query += ' AND phase = ?';
        params.push(phase);
      }

      // Host filter
      if (host) {
        query += ' AND host = ?';
        params.push(host);
      }

      // Status category filter
      if (statusCategory) {
        if (statusCategory === '2xx') {
          query += ' AND status >= 200 AND status < 300';
        } else if (statusCategory === '3xx') {
          query += ' AND status >= 300 AND status < 400';
        } else if (statusCategory === '4xx') {
          query += ' AND status >= 400 AND status < 500';
        } else if (statusCategory === '5xx') {
          query += ' AND status >= 500 AND status < 600';
        } else if (statusCategory === 'errors') {
          query += ' AND (error_message IS NOT NULL OR status >= 400)';
        }
      } else if (status) {
        query += ' AND status = ?';
        params.push(parseInt(status as string, 10));
      }

      // Search filter
      if (search) {
        query += ' AND (url LIKE ? OR error_message LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countResult = db.prepare(countQuery).get(...params) as { count: number };
      const total = countResult.count;

      // Add ordering and pagination
      query += ' ORDER BY ts_ms DESC LIMIT ? OFFSET ?';
      params.push(limitNum, offset);

      const events = db.prepare(query).all(...params) as any[];

      // Parse JSON fields
      const parsedEvents = events.map((event) => ({
        ...event,
        req_headers: event.req_headers_json ? JSON.parse(event.req_headers_json) : null,
        res_headers: event.res_headers_json ? JSON.parse(event.res_headers_json) : null,
        request_body: event.request_body_json ? JSON.parse(event.request_body_json) : null,
        response_body: event.response_body_json ? JSON.parse(event.response_body_json) : null,
      }));

      res.json({
        events: parsedEvents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single event
  app.get('/events/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Parse JSON fields
      const parsedEvent = {
        ...event,
        req_headers: event.req_headers_json ? JSON.parse(event.req_headers_json) : null,
        res_headers: event.res_headers_json ? JSON.parse(event.res_headers_json) : null,
        request_body: event.request_body_json ? JSON.parse(event.request_body_json) : null,
        response_body: event.response_body_json ? JSON.parse(event.response_body_json) : null,
      };

      res.json(parsedEvent);
    } catch (error: any) {
      console.error('Error fetching event:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get unique hosts
  app.get('/hosts', (req: Request, res: Response) => {
    try {
      const db = getDb();
      const hosts = db.prepare('SELECT DISTINCT host FROM events WHERE host IS NOT NULL ORDER BY host').all() as any[];
      res.json(hosts.map((h) => h.host));
    } catch (error: any) {
      console.error('Error fetching hosts:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clear all events
  app.post('/clear', (req: Request, res: Response) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM events').run();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error clearing events:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

