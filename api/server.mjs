// Local development server for the portable API.
//
//   node --env-file=api/.env api/server.mjs
//
// Netlify Functions use netlify/functions/api.ts instead; this file only exists
// so the API can be exercised on a normal Node process.
import { serve } from '@hono/node-server';
import app from './app.ts';

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`banan api listening on http://127.0.0.1:${info.port}/api`);
});
