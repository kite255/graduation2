import { readFile } from 'node:fs/promises';
import { pool } from './db.js';
try {
 const sql = await readFile(new URL('../sql/001_gallery.sql', import.meta.url), 'utf8');
 await pool.query(sql);
 console.log('Gallery migration complete');
} finally { await pool.end(); }
