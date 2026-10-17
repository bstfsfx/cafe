import express, { type Express, type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import { Readable } from "node:stream";

export function firstHeader(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
}

export function toWebRequest(req: ExpressRequest): Request {
  const forwardedHost = firstHeader(req.headers["x-forwarded-host"]);
  const host = forwardedHost || firstHeader(req.headers.host) || "localhost:3000";
  const originHeader = req.headers.origin;
  const originProtocol = typeof originHeader === "string" ? new URL(originHeader).protocol.replace(":", "") : undefined;
  const forwardedProtocol = firstHeader(req.headers["x-forwarded-proto"]);
  const isManusPreview = host.endsWith(".sg2.manus.computer") || host.endsWith(".manus.computer");
  const protocol = forwardedProtocol || originProtocol || (isManusPreview ? "https" : "http");
  const url = new URL(req.originalUrl || "/", `${protocol}://${host}`);
  const headers = new Headers();
  const hopByHop = new Set(["connection", "content-length", "host", "keep-alive", "transfer-encoding", "upgrade"]);
  for (const [name, value] of Object.entries(req.headers)) {
    if (value == null || hopByHop.has(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return new Request(url, { method, headers });
  const body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
  return new Request(url, { method, headers, body, duplex: "half" } as RequestInit);
}

export async function sendResponse(response: globalThis.Response, res: ExpressResponse): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== "set-cookie") res.setHeader(name, value);
  });
  const responseHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = responseHeaders.getSetCookie?.();
  if (cookies?.length) res.setHeader("set-cookie", cookies);
  if (!response.body) {
    res.end();
    return;
  }
  res.end(Buffer.from(await response.arrayBuffer()));
}

export interface CreateAppOptions {
  /**
   * In dev, pass a Vite middleware-mode dev server. Vite will SSR-transform
   * /src/server/handle-request.ts on demand.
   * In production, omit (or pass null) and pre-built artifacts under
   * ./dist-server must be present (see `pnpm build`).
   */
  loadHandleRequest?: () => Promise<{ handleRequest: (req: Request) => Promise<Response> }>;
  staticDir?: string;
}

/**
 * Build the Express app used both in dev (with a Vite dev server attached)
 * and on Vercel (as a serverless function). The caller decides how to source
 * the handleRequest module — Vite SSR in dev, dynamic import of the bundled
 * build artifact in production.
 */
export async function createApp(options: CreateAppOptions): Promise<Express> {
  const { loadHandleRequest, staticDir } = options;
  if (!loadHandleRequest) throw new Error("createApp requires loadHandleRequest");

  const app = express();
  app.disable("x-powered-by");
  if (staticDir) {
    // Public/ assets (favicon, robots, hand-made hero photos).
    app.use(express.static(staticDir, { fallthrough: true, maxAge: "1h" }));
    // Vite build output: only /assets/* (avoid serving dist/client/index.html
    // which is just a build-time entry, not a route).
    const distClient = staticDir.replace(/\/public\/?$/, "") + "/dist/client/assets";
    app.use("/assets", express.static(distClient, { fallthrough: true, maxAge: "1y", immutable: true }));
  }

  app.use(async (req, res) => {
    try {
      const mod = await loadHandleRequest();
      const response = await mod.handleRequest(toWebRequest(req));
      await sendResponse(response, res);
    } catch (error) {
      console.error("Storefront request failed:", error);
      if (!res.headersSent) res.status(500).type("text/plain").send("布藝咖啡店面暫時無法載入，請稍後再試。");
      else res.end();
    }
  });

  return app;
}
