import express, { type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);
const app = express();
app.disable("x-powered-by");
app.use(express.static(`${projectRoot}/public`, { fallthrough: true, maxAge: "1h" }));

const vite = await createViteServer({
  root: projectRoot,
  server: { middlewareMode: true, host: "0.0.0.0" },
  appType: "custom",
});
app.use(vite.middlewares);

function firstHeader(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
}

function toWebRequest(req: ExpressRequest): Request {
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

async function sendResponse(response: globalThis.Response, res: ExpressResponse): Promise<void> {
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

app.use(async (req, res) => {
  try {
    const { handleRequest } = await vite.ssrLoadModule("/src/server/handle-request.ts");
    const response = await handleRequest(toWebRequest(req));
    await sendResponse(response, res);
  } catch (error) {
    vite.ssrFixStacktrace(error as Error);
    console.error("Storefront request failed:", error);
    if (!res.headersSent) res.status(500).type("text/plain").send("布藝咖啡店面暫時無法載入，請稍後再試。");
    else res.end();
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`布藝咖啡 SSR listening on 0.0.0.0:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => void vite.close());
  });
}
