# server

## Overview

The Nitro package in this workspace hosts the API surface for the Eidolon project. It exposes the usual `/hello` health check and a catch-all SPA route that streams `packages/web/index.html` so the single-page application can live behind the same worker URL.

## Runtime hooks

Initialization is coordinated through `src/init.ts`. Any route that needs access to persistent services should `await ensureServerInitialized()` before handling the request.

### Mongoose

`src/hooks/mongoose.ts` keeps a single connection pool, exposes helpers to connect/disconnect, and logs basic lifecycle events. The helper respects `process.env.MONGO_URI`/`MONGODB_URI` and defaults to `mongodb://127.0.0.1:27017/eidolon`.

### Screenshot server

`src/hooks/screenshots.ts` wires an in-memory job store, token signer/verifier, and a periodic expiration sweep. The service is bootstrapped from the shared init helper so that screenshot routes (to come) can rely on consistent state even in hot reload/dev scenarios. Environment knobs include `SCREENSHOT_JOB_EXPIRY_MS` and `SCREENSHOT_TOKEN_SECRET`.

## SPA entry point

Any GET request that is not matched by a more specific route is handled by `src/routes/[[...spa]].get.ts`. That handler ensures the hooks are initialized and then streams the `packages/web/index.html` file with a `text/html` content type so the client router can take over.

## Running

```bash
yarn workspace @eidolon/server dev
```

The command starts Nitro in dev mode (`nitro dev`). The SPA route assumes that the front-end assets are either built into `packages/web/dist` or that the Vite dev server is running separately during local development.
