# services/api (Nitro Auth API)

This workspace hosts the DigitalOcean Nitro server that owns auth, sessions, CSRF, and Postgres access. Cloudflare Pages (`apps/edge`) proxies `/api/*` to this server, so the backend only needs to trust cookie headers coming through the edge.

## Architecture
- Nitro runs in a Node-based environment (not edge) and speaks directly to Postgres via `pg` + Drizzle.
- Auth is cookie-based with server-side hashed sessions and double-submit CSRF protection.
- CORS echoes the allowed origin from `CORS_ALLOWED_ORIGINS`, always allows credentials, and only exposes state-changing headers when permitted.

## Environment variables
Copy `.env.example` to `.env` and fill in values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `AUTH_PEPPER` | Long, secret string appended to every session token before hashing. |
| `SESSION_TTL_SECONDS` | Session lifetime (default 1,209,600 seconds = 14 days). |
| `COOKIE_DOMAIN` | Optional domain for session/csrf cookies (omit for per-host cookies). |
| `COOKIE_SECURE` | Set to `true` in production to enforce Secure. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins that may call the API (e.g. `https://app.example.com,http://localhost:8787`). |
| `NODE_ENV` | `development` or `production`. |
| `POSTGRES_MAX_CONNECTIONS` | Optional config for pg Pool. Defaults to 10. |
| `POSTGRES_SSL` | Set to `true` if Postgres requires SSL. |

## Running locally
```
cd services/api
yarn install
cp .env.example .env       # or set the vars directly
yarn dev
```
Nitro will listen on port 3001 by default (mirrors `apps/edge` dev proxy). Keep `apps/edge` running in another terminal so Cloudflare Pages can reach this endpoint.

## Building / production
```
cd services/api
yarn build
NODE_ENV=production DATABASE_URL=... yarn start
```
`yarn start` runs `node dist/server/index.js` after the Nitro build. Host the resulting server behind HTTPS on your DigitalOcean droplet and set `API_ORIGIN` to its base URL.

## Database migrations
Drizzle is configured with `db/schema.ts`. Initial SQL lives in `db/migrations/0001_init.ts`. To generate new migrations:
1. `yarn drizzle:generate --name <description>`
2. Review the generated file under `db/migrations`.
3. `yarn drizzle:push` to apply against `DATABASE_URL`.

## Example curl flows
Assume `API_ORIGIN=https://api.example.com` and `EDGE_ALLOWED_ORIGIN=https://app.example.com`.

1. **Login and capture cookies**
```bash
COOKIE_JAR=/tmp/session-cookies.txt
curl -X POST "https://api.example.com/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.example.com" \
  -c $COOKIE_JAR \
  -d '{"email":"tester@example.com","password":"hunter2"}'
```

2. **Call `/auth/me` using stored cookies**
```bash
curl "https://api.example.com/auth/me" \
  -H "Origin: https://app.example.com" \
  -b $COOKIE_JAR
```

3. **Logout (needs CSRF token)**
```bash
CSRF_TOKEN=$(grep csrf $COOKIE_JAR | awk '{print $7}')
curl -X POST "https://api.example.com/auth/logout" \
  -H "Origin: https://app.example.com" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b $COOKIE_JAR
```

Cookies are stored by the Cloudflare proxy, so the edge functions simply forward the `Cookie` header they receive from the browser.

## Cloudflare edge proxy
The companion proxy lives in `apps/edge`. Keep `API_ORIGIN` pointing to this Nitro service so `/api/*` requests automatically hit the auth server through the edge.
