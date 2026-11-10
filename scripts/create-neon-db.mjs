// Create a fresh Claimable Postgres database (Neon, no account required).
//
//   node scripts/create-neon-db.mjs [output-file]
//
// The API returns a pooled connection string and a claim URL. The JSON response
// is written to backups/ (git-ignored) so secrets never reach the repository or
// the console.
import fs from 'node:fs';
import path from 'node:path';

const outFile = process.argv[2] || 'backups/neon-unclaimed-new.json';

const response = await fetch('https://neon.new/api/v1/database', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ref: 'banan-fund' }),
});
const text = await response.text();
if (!response.ok) {
  throw new Error(`create database -> ${response.status} ${text.slice(0, 300)}`);
}
const data = JSON.parse(text);
if (!data.connection_string || !data.claim_url) {
  throw new Error('unexpected response from neon.new');
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log('created claimable database');
console.log('id:', data.id);
console.log('neon project:', data.neon_project_id);
console.log('status:', data.status);
console.log('expires:', data.expires_at);
console.log('claim url:', data.claim_url);
console.log('saved to:', outFile);
