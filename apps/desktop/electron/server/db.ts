import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

let db: Database.Database | null = null;
let dbPath: string | null = null;

export function setDbPath(path: string) {
  dbPath = path;
}

export function getDbPath(): string {
  if (!dbPath) {
    // Fallback if not set - should not happen if setDbPath is called first
    throw new Error('Database path not set. Call setDbPath() first.');
  }
  return dbPath;
}

export async function initDb() {
  const finalPath = getDbPath();
  
  const dbDir = path.dirname(finalPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(finalPath);

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      ts_ms INTEGER NOT NULL,
      phase TEXT NOT NULL,
      method TEXT,
      url TEXT NOT NULL,
      host TEXT,
      path TEXT,
      status INTEGER,
      duration_ms INTEGER,
      service TEXT,
      runtime TEXT,
      trace_id TEXT,
      request_id TEXT,
      req_headers_json TEXT,
      res_headers_json TEXT,
      request_body_json TEXT,
      response_body_json TEXT,
      error_message TEXT,
      truncated INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_ts_ms ON events(ts_ms);
    CREATE INDEX IF NOT EXISTS idx_host ON events(host);
    CREATE INDEX IF NOT EXISTS idx_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_phase ON events(phase);
    CREATE INDEX IF NOT EXISTS idx_trace_id ON events(trace_id);
    CREATE INDEX IF NOT EXISTS idx_method ON events(method);
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

