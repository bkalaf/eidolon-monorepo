import { H3Event, createError, getCookie } from "h3";
import { config } from "../config";

const STATEFUL_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const ensureCsrf = (event: H3Event) => {
  const method = event.node.req.method?.toUpperCase()
    ? event.node.req.method.toUpperCase()
    : "";
  if (!STATEFUL_METHODS.has(method)) {
    return;
  }

  const headerToken = event.node.req.headers["x-csrf-token"];
  const csrfCookie = getCookie(event, config.CSRF_COOKIE_NAME);

  if (!headerToken || !csrfCookie || headerToken !== csrfCookie) {
    throw createError({ statusCode: 403, statusMessage: "CSRF token missing or mismatched" });
  }
};
