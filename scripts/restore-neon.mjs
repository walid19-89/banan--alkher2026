// Restore the portable schema, data and portable-auth migration into a fresh
// database. Safe to re-run on an empty database only.
//
//   node scripts/restore-neon.mjs backups/neon-unclaimed-new.json
import fs from 'node:fs';
import postgres from 'postgres';

const source = process.argv[2] || 'backups/neon-unclaimed-new.json';
const parsed = JSON.parse(fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, ''));
const connectionString = process.env.DATABASE_URL || parsed.connection_string;
if (!connectionString) throw new Error('connection string not found');

const files = [
  'backups/schema-portable.sql',
  'backups/data-portable.sql',
  'supabase/migrations/0014_portable_auth_and_storage.sql',
];

const sql = postgres(connectionString, {
  max: 1,
  ssl: 'require',
  prepare: false,
  connect_timeout: 30,
});

try {
  for (const file of files) {
    const body = fs.readFileSync(file, 'utf8');
    const started = Date.now();
    await sql.unsafe(body);
    console.log(`applied ${file} in ${Date.now() - started} ms`);
  }

  const tables = [
    'fund_members',
    'fund_subscriptions',
    'fund_receipts',
    'fund_receipt_allocations',
    'fund_member_credit_ledger',
    'fund_user_profiles',
    'fund_backups',
    'fund_attachments',
  ];
  for (const table of tables) {
    const rows = await sql.unsafe(`select count(*)::int as c from public.${table}`);
    console.log(`${table}: ${rows[0].c}`);
  }
  const users = await sql`select count(*)::int as c from auth.users`;
  console.log(`auth.users: ${users[0].c}`);
  const paid = await sql`select coalesce(sum(amount), 0)::numeric as total from public.fund_receipts`;
  console.log(`receipts total: ${paid[0].total}`);
  const payload = await sql`select public.fund_dashboard_payload(1448, 5) as data`;
  console.log(`dashboard function: ${payload[0]?.data ? 'ok' : 'empty'}`);
} finally {
  await sql.end({ timeout: 10 });
}
