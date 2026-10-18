/**
 * Vercel serverless entrypoint (Node.js runtime, (req, res) signature).
 *
 * Vercel wraps the default export of an `api/*.ts` file in its Node.js
 * serverless launcher. The launcher hands us a Node `IncomingMessage`-like
 * request and a `ServerResponse`-like response. We:
 *
 *   1. Read the body and headers from `req` and build a Web `Request`.
 *   2. Run our prebuilt `dist-server/handle-request.ts` SSR handler with it.
 *   3. Take the resulting Web `Response` and write it onto `res`.
 *
 * Static assets are served by Vercel's edge CDN from `dist/client/` (set
 * via `outputDirectory` in `vercel.json`), so we don't need to handle
 * `/assets/*` here.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { handleRequest } from "../dist-server/handle-request.js";

// Vercel runs Node 22 by default for the Node.js runtime. Force our asset
// resolver to read the hashed /assets/* paths from dist/client/index.html.
process.env.NODE_ENV = process.env.NODE_ENV ?? "production";
process.env.BUKAAFE_PRODUCTION = "1";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[]>;
  cookies?: Record<string, string | string[]>;
};

async function readBody(req: VercelRequest): Promise<Uint8Array | undefined> {
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return undefined;
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function toWebRequest(req: VercelRequest, body: Uint8Array | undefined): Request {
  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers.host as string) ||
    "localhost:3000";
  const url = `${protocol}://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
  }
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }
  return new Request(url, { method, headers, body: body ?? undefined });
}

async function writeResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  res.statusMessage = response.statusText ?? "OK";
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() === "set-cookie") return;
    res.setHeader(name, value);
  });
  const setCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  if (setCookie?.length) res.setHeader("set-cookie", setCookie);
  if (!response.body) {
    res.end();
    return;
  }
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  try {
    const body = await readBody(req);
    const webReq = toWebRequest(req, body);
    const webRes = await handleRequest(webReq);
    await writeResponse(res, webRes);
  } catch (error) {
    console.error("Bukaafe SSR error:", (error as Error).message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(`布藝咖啡店面暫時無法載入：${(error as Error).message ?? String(error)}`);
    }
  }
}
