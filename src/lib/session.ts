// Local session storage for the portable API.
//
// The API issues its own HS256 token (30 days) instead of a Supabase session,
// so the app only needs to keep one string in localStorage.
const TOKEN_KEY = 'banan-fund-token';

let cachedToken: string | null | undefined;

export function getStoredToken(): string | null {
  if (cachedToken !== undefined) return cachedToken;
  try {
    cachedToken = window.localStorage.getItem(TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export function setStoredToken(token: string | null) {
  cachedToken = token;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — keep the in-memory copy only */
  }
}
