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

The script runs `nitro dev` inside this workspace. In production the worker bundles `packages/web` assets separately, while local development can run the Vite server in parallel if you prefer.
