import { H3Event, setHeader } from "h3";
import { isOriginAllowed } from "../config";

const ALLOWED_METHODS = "GET,POST,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,X-CSRF-Token";
const EXPOSE_HEADERS = "Content-Type";

export const handleCors = (event: H3Event): Response | undefined => {
  const origin = event.node.req.headers.origin;
  const allowedOrigin = origin && isOriginAllowed(origin) ? origin : undefined;
  if (allowedOrigin) {
    setHeader(event, "Access-Control-Allow-Origin", allowedOrigin);
  }
  setHeader(event, "Access-Control-Allow-Credentials", "true");
  setHeader(event, "Access-Control-Allow-Methods", ALLOWED_METHODS);
  setHeader(event, "Access-Control-Allow-Headers", ALLOWED_HEADERS);
  setHeader(event, "Access-Control-Expose-Headers", EXPOSE_HEADERS);

  if (event.node.req.method === "OPTIONS") {
    const status = origin && !allowedOrigin ? 403 : 204;
    return new Response(null, { status });
  }
};
