//server/src/routes/hello.get.ts
import { ensureServerInitialized } from "../init.js";

export default defineEventHandler(async () => {
  await ensureServerInitialized();
  return {
    ok: true,
    message: "hello from nitro on workers",
  };
});
