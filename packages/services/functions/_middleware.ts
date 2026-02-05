export const onRequest = async ({ request, env, next }: { request: Request; env: Record<string, string>; next: () => Promise<Response> }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api")) {
    console.log(`[edge] ${request.method} ${url.pathname}`);
    const raw = env?.EDGE_ALLOWED_ORIGIN ?? "";
    const allowedOrigins = raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const originHeader = request.headers.get("Origin");
    if (originHeader && allowedOrigins.length && !allowedOrigins.includes(originHeader)) {
      return new Response("Origin not allowed", { status: 403 });
    }
  }
  return next();
};
