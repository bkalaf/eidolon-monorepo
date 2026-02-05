import { connectMongo } from "./hooks/mongoose.js";
import { initializeScreenshotServer } from "./hooks/screenshots.js";

let initPromise: Promise<void> | null = null;

export function ensureServerInitialized() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await connectMongo();
      initializeScreenshotServer();
    } catch (error) {
      initPromise = null;
      console.error("[server init] failed to initialize services", error);
      throw error;
    }
  })();

  return initPromise;
}
