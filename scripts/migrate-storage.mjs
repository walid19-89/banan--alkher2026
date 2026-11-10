// Copy Supabase Storage objects into the portable fund_storage table.
//
//   node --env-file=.env scripts/migrate-storage.mjs
//
// Idempotent: objects already present with the same size are skipped. Secrets
// are read from .env and never printed.
import fs from 'node:fs';
import postgres from 'postgres';

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL =
  (process.argv[2]
    ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, '')).connection_string
    : null) || process.env.DATABASE_URL;
if (!SUPABASE_URL || !KEY || !DATABASE_URL) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL are required');
}

const BUCKETS = ['fund-files', 'fund-backups'];
const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

async function storageList(bucket) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix: '', limit: 1000, offset: 0 }),
  });
  if (!response.ok) {
    throw new Error(`list ${bucket} -> ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  return response.json();
}

async function download(bucket, name) {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(name)}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  if (!response.ok) {
    throw new Error(`download ${bucket}/${name} -> ${response.status}`);
  }
  const mime = response.headers.get('content-type') ?? 'application/octet-stream';
  return { bytes: new Uint8Array(await response.arrayBuffer()), mime };
}

let copied = 0;
let skipped = 0;
let bytes = 0;
for (const bucket of BUCKETS) {
  let items = [];
  try {
    items = await storageList(bucket);
  } catch (error) {
    console.error(String(error.message ?? error));
    continue;
  }
  for (const item of items) {
    if (!item?.name || item.name.endsWith('/')) continue;
    const existing = await sql`select size_bytes from fund_storage
      where bucket = ${bucket} and path = ${item.name} limit 1`;
    if (existing.length && Number(existing[0].size_bytes) === Number(item.metadata?.size ?? -1)) {
      skipped += 1;
      continue;
    }
    const { bytes: data, mime } = await download(bucket, item.name);
    await sql`insert into fund_storage as s (bucket, path, mime_type, size_bytes, data)
      values (${bucket}, ${item.name}, ${mime}, ${data.byteLength}, ${data})
      on conflict (bucket, path) do update set
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        data = excluded.data,
        updated_at = now()`;
    copied += 1;
    bytes += data.byteLength;
  }
  console.log(`${bucket}: ${items.length} objects seen`);
}

await sql.end({ timeout: 5 });
console.log(`copied ${copied} objects (${bytes} bytes), skipped ${skipped} already present`);
