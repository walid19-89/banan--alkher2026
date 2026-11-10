/**
 * Create (or update) the Neon preview site on Netlify and configure its
 * environment variables. Secrets are read from api/.env and
 * backups/neon-unclaimed.json and are never printed.
 *
 * Usage: node scripts/setup-preview-site.mjs [site-name]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = 'https://api.netlify.com/api/v1';
const SITE_NAME = process.argv[2] || 'banan-neon-preview';

function readToken() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN.trim();
  const candidates = [
    path.join(process.env.APPDATA || '', 'netlify', 'Config', 'config.json'),
    path.join(os.homedir(), '.netlify', 'config.json'),
    path.join(process.env.LOCALAPPDATA || '', 'netlify', 'Config', 'config.json'),
  ];
  for (const file of candidates) {
    if (!file || !fs.existsSync(file)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const key of Object.keys(config.users || {})) {
        const token = config.users[key]?.auth?.token;
        if (token) return token;
      }
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error('Netlify token not found. Run: netlify login');
}

const token = readToken();

async function api(method, suffix, body) {
  const response = await fetch(`${API}${suffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${method} ${suffix} -> ${response.status} ${String(text).slice(0, 300)}`);
  }
  return data;
}

function readEnvFile(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_]+)=(.*)$/.exec(line);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const local = readEnvFile('api/.env');
const neon = JSON.parse(
  fs.readFileSync('backups/neon-unclaimed.json', 'utf8').replace(/^\uFEFF/, '')
);

const sites = await api('GET', '/sites?per_page=100');
let site = (sites || []).find((item) => item.name === SITE_NAME);
if (!site) {
  site = await api('POST', '/sites', { name: SITE_NAME });
  console.log(`created site ${SITE_NAME}`);
} else {
  console.log(`reusing site ${SITE_NAME}`);
}
if (site.sso_login) {
  site = await api('PATCH', `/sites/${site.id}`, { sso_login: false });
}

const siteUrl = site.ssl_url || site.url || `https://${SITE_NAME}.netlify.app`;
const env = {
  DATABASE_URL: neon.connection_string,
  AUTH_SECRET: local.AUTH_SECRET,
  CRON_SECRET: local.CRON_SECRET,
  APP_ORIGINS: [
    siteUrl,
    'https://banan-fund.netlify.app',
    'https://walid19-89.github.io',
    'https://abdulhame709.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://localhost',
    'capacitor://localhost',
  ].join(','),
  VITE_API_BASE_URL: '/api',
  PG_POOL_MAX: '2',
  DB_SSL: 'require',
};

for (const [key, value] of Object.entries(env)) {
  if (!value) throw new Error(`missing required value for ${key}`);
  await api('POST', `/accounts/${site.account_slug}/env?site_id=${site.id}`, [
    { key, values: [{ value, context: 'all' }] },
  ]);
}

console.log(`site id: ${site.id}`);
console.log(`site url: ${siteUrl}`);
console.log(`environment variables configured: ${Object.keys(env).join(', ')}`);
