type Env = {
  API_ORIGIN?: string;
};

type Context = {
  request: Request;
  env: Env;
  params: { path?: string[] };
};

const getBaseUrl = (input?: string) => {
  if (!input) return null;
  try {
    return new URL(input);
  } catch (err) {
    console.error("Invalid API_ORIGIN", err);
    return null;
  }
};

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const onRequest = async ({ request, env, params }: Context): Promise<Response> => {
  const base = getBaseUrl(env.API_ORIGIN);
  if (!base) {
    return new Response("Missing or invalid API_ORIGIN", { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const basePath = stripTrailingSlash(base.pathname || "");
  const dynamicPath = params.path ? params.path.filter(Boolean).join("/") : "";
  const joinedPath = [basePath, dynamicPath].filter(Boolean).join("/");
  base.pathname = `/${joinedPath}`;
  base.search = incomingUrl.search;

  const proxyRequest = new Request(base.toString(), request);
  return fetch(proxyRequest);
};
