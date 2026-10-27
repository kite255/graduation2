import 'dotenv/config';
import pg from 'pg';

// Supports DATABASE_URL for local development and PG* variables in Docker.
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  throw new Error('Set DATABASE_URL or PGHOST and other PG* values');
}
export const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool();
