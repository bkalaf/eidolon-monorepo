# services

## Overview

This workspace runs the Nitro API for Eidolon. It serves the `/hello` check, provides hooks for server-side concerns (Mongo + screenshot jobs), and routes every other GET request through the SPA entry so that `packages/web/index.html` bootstraps the single-page UI.

## Runtime hooks

`src/init.ts` orchestrates the shared runtime pieces and is already invoked by health-check routes before they respond.

### Mongoose

`src/hooks/mongoose.ts` maintains a singleton connection pool, respects `MONGO_URI`/`MONGODB_URI`, and logs lifecycle events. That helper is safe for warm reloads and keeps `strictQuery` enabled.

### Screenshot queue

`src/hooks/screenshots.ts` keeps an in-memory `ScreenshotJob` store, short-lived render tokens, and a cleanup sweep. It is wired from the same init helper so future screenshot routes can assume the store is ready. You can tweak `SCREENSHOT_JOB_EXPIRY_MS` and `SCREENSHOT_TOKEN_SECRET` for the dev cluster.

## SPA entry point

`src/routes/[[...spa]].get.ts` is the fallback handler. It waits for the init hook, reads `packages/web/index.html`, and streams it with `text/html` so the client router continues to resolve every path.

## Running

```bash
yarn workspace @eidolon/services dev
```

The script runs `nitro dev` inside this workspace. In production the worker bundles `packages/web` assets separately, while local development can run the Vite server in parallel if you prefer.
