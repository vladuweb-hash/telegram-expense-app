import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const db = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection events
db.on('connect', () => {
  logger.debug('New client connected to database');
});

db.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

// Query helper with logging
export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await db.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms: ${text.slice(0, 100)}`);
    return result;
  } catch (error) {
    logger.error('Query error:', { text, error });
    throw error;
  }
}

export default db;
