import { connectPostgres } from "./hooks/postgres.js";
import { initializeScreenshotServer } from "./hooks/screenshots.js";

let initPromise: Promise<void> | null = null;

export function ensureServerInitialized() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await connectPostgres();
      initializeScreenshotServer();
    } catch (error) {
      initPromise = null;
      console.error("[server init] failed to initialize services", error);
      throw error;
    }
  })();

  return initPromise;
}
