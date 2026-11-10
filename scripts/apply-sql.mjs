// Apply a SQL file to the portable/Neon database.
//
//   node scripts/apply-sql.mjs supabase/migrations/0014_portable_auth_and_storage.sql
//
// The connection string comes from DATABASE_URL, or from the Neon claim file
// written by scripts/create-neon.mjs. Credentials are never printed.
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

function readUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = path.join(process.cwd(), 'backups', 'neon-unclaimed.json');
  if (!fs.existsSync(file)) {
    throw new Error('DATABASE_URL is not set and backups/neon-unclaimed.json is missing');
  }
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(raw);
  if (!parsed.connection_string) throw new Error('connection_string missing from Neon claim file');
  return parsed.connection_string;
}

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/apply-sql.mjs <file.sql>');
  process.exit(1);
}
const sqlText = fs.readFileSync(file, 'utf8');
const sql = postgres(readUrl(), { max: 1, ssl: 'require', prepare: false });
try {
  await sql.unsafe(sqlText);
  console.log(`applied ${file}`);
} finally {
  await sql.end({ timeout: 5 });
}
