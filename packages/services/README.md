# services

## Overview

This workspace runs the Nitro API for Eidolon. It serves the `/hello` check, provides hooks for server-side concerns (Postgres + screenshot jobs), and routes every other GET request through the SPA entry so that `packages/web/index.html` bootstraps the single-page UI.

## Runtime hooks

`src/init.ts` orchestrates the shared runtime pieces and is already invoked by health-check routes before they respond.

### Postgres

`src/hooks/postgres.ts` maintains a shared `pg.Pool`, exposes drizzle helpers, and respects `DATABASE_URL`, `POSTGRES_MAX_CONNECTIONS`, and `POSTGRES_SSL`. The init helper warms the connection first, so the rest of the API can safely grab `getPostgresPool()` or `getPostgresDrizzle()` without reconnect logic.

### Screenshot queue

`src/hooks/screenshots.ts` keeps an in-memory `ScreenshotJob` store, short-lived render tokens, and a cleanup sweep. It is wired from the same init helper so future screenshot routes can assume the store is ready. You can tweak `SCREENSHOT_JOB_EXPIRY_MS` and `SCREENSHOT_TOKEN_SECRET` for the dev cluster.

## SPA entry point

`src/routes/[[...spa]].get.ts` is the fallback handler. It waits for the init hook, reads `packages/web/index.html`, and streams it with `text/html` so the client router continues to resolve every path.

## Running

```bash
yarn workspace @eidolon/services dev
```

## Authentication API

### Environment

- `DATABASE_URL` (runtime, app role with only the tables/rows it needs)
- `APP_ORIGIN` (defaults to `https://app.example.com`)
- `API_ORIGIN` (defaults to `https://api.example.com`)
- `RESEND_API_KEY` (required to send transactional email via Resend HTTP API)
- `COOKIE_DOMAIN` (optional; omitting it yields host-only cookies)
- `NODE_ENV` (production toggles secure cookies)

### Database roles & migrations

- **App role**: granted only the needed CRUD privileges on `users`, `sessions`, and `refresh_tokens`. It runs the Node.js process that handles auth flows.
- **Migration role**: used when running `db/migrations/001_init.sql`; it is allowed to create extensions (`pgcrypto`), tables, indexes, and helper functions.
- Run migrations with the privileged role:

  ```bash
  psql "$DATABASE_URL" -f packages/services/db/migrations/001_init.sql
  ```

  The migration file creates the core tables plus helper functions `cleanup_expired_sessions()` and `cleanup_revoked_or_expired_refresh_tokens()` that you can call from a nightly job.

### Security baseline

- Passwords are hashed using Argon2id (memoryCost=2^17, timeCost=3, parallelism=2). Only the hash is stored.
- Email verification/reset/refresh tokens are never stored raw: a SHA-256 hex digest is persisted while the raw token is sent only via email or cookie.
- Session cookies are `HttpOnly`, `Secure`, `SameSite=Lax`, and rotate on every login/refresh. `refresh` cookies follow the same options but are scoped to `/auth/refresh`.
- CSRF protection combines an origin allow list (only `https://app.example.com` or `https://api.example.com` for browser requests) with a double-submit cookie (`GET /auth/csrf`) and matching `x-csrf-token` header for each state-changing POST.
- Rate limiting currently uses an in-memory map (see `src/middleware/rateLimit.js`). Replace it with Redis/Cloudflare WAF/NGINX before scaling.
- Sessions expire after 24 hours with sliding renewal triggered when < 6 hours remain; `last_seen_at` is only updated when the previous update is older than five minutes.
- Sessions cap at ten per user; the helper `enforceSessionLimit` deletes older sessions automatically. You should still run the cleanup functions from the migration file nightly or via a background job.

### Frontend integration

- Always call `GET https://api.example.com/auth/csrf` to seed the `csrf` cookie before any POST/PUT/DELETE call. Include the cookie value in the `x-csrf-token` header.
- Every browser fetch must use `credentials: "include"` so cookies and CSRF headers are sent (same-site `example.com` setup):

  ```ts
  const csrfResp = await fetch("https://api.example.com/auth/csrf", {
    method: "GET",
    credentials: "include",
  });
  const csrfToken = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("csrf="))
    ?.split("=")[1];

  await fetch("https://api.example.com/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken ?? "",
    },
    body: JSON.stringify({ email, password, rememberMe: true }),
  });
  ```

- The API flow:
  1. `POST /auth/register` – creates a user, sends a verification email, issues a session cookie, and returns `{ ok: true }` (201) without leaking account existence.
  2. `GET /auth/verify-email?token=...` – marks the account verified and redirects to `https://app.example.com/verified`.
  3. `POST /auth/login` – rotates the session, issues optional refresh token cookie (45-day expiry), and never reveals if the email exists during failure.
  4. `POST /auth/refresh` – rotates both session and refresh tokens. If a revoked refresh token is reused, all sessions/refresh tokens for that user are revoked immediately.
  5. `POST /auth/logout` & `/auth/logout-all` – clear cookies, delete sessions, and revoke refresh tokens (per device or all devices respectively).
  6. Password reset flow:
     - `POST /auth/password-reset/request` – always returns 204; if the verified user exists, a reset token (30-minute life) is emailed.
     - `POST /auth/password-reset/confirm` – swaps in the new password, wipes sessions, and revokes refresh tokens.

### Email

- All transactional email goes through Resend (`sendVerifyEmail` and `sendPasswordResetEmail` in `src/mailer/resend.js`). Each message includes both plain-text and HTML bodies and logs any delivery errors without leaking secrets.
- Use `RESEND_API_KEY` in production; development warns when the key is missing.

### Curl cheatsheet

```bash
# fetch CSRF token
curl -i -c /tmp/cookies.txt https://api.example.com/auth/csrf
# register/login (replace placeholders)
curl -X POST https://api.example.com/auth/register \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <value from csrf cookie>" \
  -b /tmp/cookies.txt \
  -d '{"email":"user@example.com","password":"StrongPass123"}'

curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <value from csrf cookie>" \
  -b /tmp/cookies.txt \
  -d '{"email":"user@example.com","password":"StrongPass123","rememberMe":true}'
```

### Operational notes

- Cloudflare terminates TLS, so Express declares `app.set("trust proxy", 1)` to ensure secure cookies respect the original `https://` scheme.
- `COOKIE_DOMAIN` can scope cookies to a shared root (e.g., `.example.com`) when the frontend and API run on different subdomains.
- Cron jobs should call `SELECT cleanup_expired_sessions()` and `SELECT cleanup_revoked_or_expired_refresh_tokens()` nightly to drop stale sessions/refresh records.

The script runs `nitro dev` inside this workspace. In production the worker bundles `packages/web` assets separately, while local development can run the Vite server in parallel if you prefer.
