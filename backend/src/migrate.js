import { readFile } from 'node:fs/promises';
import { pool } from './db.js';
try {
  for (const name of ['001_gallery.sql', '002_sites.sql']) {
    const sql = await readFile(new URL(`../sql/${name}`, import.meta.url), 'utf8');
    await pool.query(sql);
    console.log(`Applied ${name}`);
  }
  console.log('Database migrations complete');
} finally {
  await pool.end();
}
