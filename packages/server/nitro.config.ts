//server/nitro.config.ts
import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  preset: "cloudflare",
  srcDir: "src",
});
