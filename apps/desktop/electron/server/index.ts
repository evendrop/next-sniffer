import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { setupRoutes } from './routes.js';
import { setupRealtime } from './realtime.js';

export async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Initialize database
  await initDb();

  // Setup real-time updates FIRST (before /events route)
  setupRealtime(app);

  // Setup routes
  setupRoutes(app);

  const PORT = 9432;
  const HOST = '127.0.0.1';

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
      resolve(server);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${PORT} is already in use. Please close the application using that port.`));
      } else {
        reject(error);
      }
    });
  });
}

