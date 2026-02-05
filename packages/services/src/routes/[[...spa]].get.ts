import { promises as fs } from "node:fs";
import { defineEventHandler, setResponseHeader } from "h3";
import { ensureServerInitialized } from "../init.js";

const indexPath = new URL("../../../web/index.html", import.meta.url);
let cachedIndex: Buffer | null = null;

async function loadIndexHtml() {
  if (cachedIndex) {
    return cachedIndex;
  }

  const file = await fs.readFile(indexPath);
  cachedIndex = file;
  return file;
}

export default defineEventHandler(async (event) => {
  await ensureServerInitialized();
  const html = await loadIndexHtml();
  setResponseHeader(event, "content-type", "text/html; charset=utf-8");
  return html;
});
