// End-to-end smoke test for the portable API against a real database.
//
//   node --env-file=api/.env scripts/test-api.mjs
//
// It creates a disposable admin account, exercises the read endpoints, creates
// and downloads a backup, then removes everything it created. The password is
// random and never printed.
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:8787/api';
const ORIGIN = BASE.replace(/\/api$/, '');
const email = `smoke-${randomUUID()}@example.invalid`;
const password = randomBytes(24).toString('base64url');
const sql = postgres(process.env.DATABASE_URL, { max: 2, ssl: 'require', prepare: false });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// Every request gets a hard timeout so a hanging socket fails the test instead
// of blocking the whole run. Database round trips from Yemen to Neon are slow
// on a cold connection, so the backup endpoints get a larger budget.
const req = (path, init = {}, timeoutMs = 45_000) =>
  fetch(path.startsWith('http') ? path : `${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });

let userId = null;
let token = null;
let backupId = null;
try {
  const created = await sql`insert into auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    values (${email}, ${bcrypt.hashSync(password, 10)}, now(), ${sql.json({ full_name: 'اختبار آلي', phone: null })})
    returning id`;
  userId = created[0].id;
  await sql`update fund_user_profiles set role = 'admin', active = true, approval_status = 'approved'
    where user_id = ${userId}`;

  let res = await req('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const login = await res.json().catch(() => ({}));
  token = login?.session?.access_token ?? null;
  check('POST /auth/login', res.status === 200 && Boolean(token), `status ${res.status}`);

  const auth = { Authorization: `Bearer ${token}` };

  res = await req('/auth/me', { headers: auth });
  const me = await res.json().catch(() => ({}));
  check('GET /auth/me', res.status === 200 && me?.user?.id === userId, `status ${res.status}`);

  res = await req('/dashboard', { headers: auth });
  const dashboard = await res.json().catch(() => ({}));
  check('GET /dashboard', res.status === 200, `status ${res.status} keys=${Object.keys(dashboard).length}`);

  res = await req('/members', { headers: auth });
  const members = await res.json().catch(() => ({}));
  check('GET /members', res.status === 200 && Array.isArray(members.members), `${members.members?.length ?? 0} rows`);

  res = await req('/receipts', { headers: auth });
  const receipts = await res.json().catch(() => ({}));
  check('GET /receipts', res.status === 200 && Array.isArray(receipts.receipts), `${receipts.receipts?.length ?? 0} rows`);

  res = await req('/subscriptions', { headers: auth });
  const subs = await res.json().catch(() => ({}));
  check('GET /subscriptions', res.status === 200 && Array.isArray(subs.subscriptions), `${subs.subscriptions?.length ?? 0} rows`);

  res = await req('/reports/summary', { headers: auth });
  check('GET /reports/summary', res.status === 200, `status ${res.status}`);

  res = await req('/backup', { method: 'POST', headers: auth }, 180_000);
  const backup = await res.json().catch(() => ({}));
  backupId = backup?.backup?.id ?? null;
  check('POST /backup', res.status === 201 && Boolean(backupId), `status ${res.status}`);

  if (backup?.url) {
    res = await req(`${ORIGIN}${backup.url}`, {}, 300_000);
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    check('GET /backups/download', res.status === 200 && parsed?.format === 'banan-fund-backup',
      `${text.length} bytes`);
  }

  if (backupId) {
    res = await req(`/backups/${backupId}`, { method: 'DELETE', headers: auth }, 120_000);
    check('DELETE /backups/:id', res.status === 200, `status ${res.status}`);
    backupId = null;
  }

  res = await req('/cron/dues', { headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' } });
  check('GET /cron/dues', res.status === 200, `status ${res.status}`);
} catch (error) {
  console.error('SMOKE ERROR', error);
  check('unexpected error', false, String(error?.message ?? error));
} finally {
  if (backupId) await sql`delete from fund_backups where id = ${backupId}`.catch(() => {});
  if (userId) await sql`delete from auth.users where id = ${userId}`.catch(() => {});
  // Remove objects whose fund_backups row never materialised (aborted runs).
  await sql`delete from fund_storage where bucket = 'fund-backups'
    and path not in (select storage_path from fund_backups)`.catch(() => {});
  await sql.end({ timeout: 5 });
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
