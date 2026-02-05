# Cloudflare Pages Edge Proxy

This workspace hosts the Cloudflare Pages Functions that proxy every `/api/*` call to the Nitro API server. It mirrors request headers, body, cookies, and responses (including `Set-Cookie`) so the edge just behaves as a thin front door.

## Key pieces
- `apps/edge/functions/api/[...path].ts` (symlink to `packages/services/functions/api/[...path].ts`): forwards method, headers, cookies, query string, and body to `API_ORIGIN`. Returns the upstream status, headers, and body directly.
- `apps/edge/functions/_middleware.ts` (symlink to `packages/services/functions/_middleware.ts`): logs API traffic and optionally enforces `EDGE_ALLOWED_ORIGIN`.

## Environment
Set these before running locally or deploying:

| Variable | Description |
| --- | --- |
| `API_ORIGIN` | The Nitro server URL (e.g. `https://api.example.com`). Used by the proxy handler. |
| `EDGE_ALLOWED_ORIGIN` | (Optional) comma-separated origins allowed to reach `/api`. Middleware rejects others to protect the proxy. |
| `NODE_ENV` | Controls `wrangler pages` builds (defaults to `development`). |

For local development, create a `.dev.vars` file:

```
API_ORIGIN=http://127.0.0.1:3001
NODE_ENV=development
```

## Local development
```bash
cd apps/edge
yarn dev
```

> Note: `apps/edge/functions` is a symlink to `packages/services/functions`, so editing happens inside the services package while `wrangler` still finds the files under `apps/edge/functions`.

## Deploy
Cloudflare Pages expects `wrangler` credentials. Once configured:
```bash
cd apps/edge
yarn deploy
```

## Testing
Any request to `https://<your-pages-domain>/api/...` is forwarded to the Nitro API server configured by `API_ORIGIN`. Ensure that `API_ORIGIN` is accessible from Cloudflare.
