// Netlify Functions entry point for the portable API.
//
// Netlify routes /api/* to this function (see netlify.toml) and Hono receives
// the original request URL, including the /api base path.
import app from '../../api/app.ts';

export default async function handler(request: Request) {
  return app.fetch(request);
}

export const config = {
  path: '/api/*',
};
