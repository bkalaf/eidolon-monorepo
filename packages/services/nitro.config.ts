//server/nitro.config.ts
import { defineNitroConfig } from "nitropack";

console.log("[nitro config] loading packages/server/nitro.config.ts");

export default defineNitroConfig({
  preset: "cloudflare",
  srcDir: "src",
});
