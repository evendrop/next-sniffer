import { Express } from 'express';
import { getDb } from './db.js';

const clients: Set<any> = new Set();

export function setupRealtime(app: Express) {
  console.log('Setting up SSE route: /events/stream');
  app.get('/events/stream', (req, res) => {
    console.log('SSE connection received');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    clients.add(res);
    console.log(`SSE client connected. Total clients: ${clients.size}`);

    req.on('close', () => {
      clients.delete(res);
      console.log(`SSE client disconnected. Total clients: ${clients.size}`);
    });

    req.on('error', (err) => {
      console.error('SSE connection error:', err);
      clients.delete(res);
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
  });
  console.log('SSE route registered');
}

export function broadcastEvent(event: any) {
  const message = `data: ${JSON.stringify({ type: 'new-event', event })}\n\n`;
  clients.forEach((client) => {
    try {
      if (!client.destroyed && !client.closed) {
        client.write(message);
        // Force flush if available
        if (typeof client.flush === 'function') {
          client.flush();
        }
      } else {
        clients.delete(client);
      }
    } catch (error) {
      clients.delete(client);
    }
  });
}

