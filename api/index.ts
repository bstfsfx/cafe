import { fileURLToPath } from "node:url";
import { createApp } from "../server";

// Vercel serverless: instantiate Express once per cold start, then handle
// every incoming HTTP request through it. We don't call .listen() because
// Vercel runs the function inside its own request wrapper.
process.env.NODE_ENV = process.env.NODE_ENV ?? "production";
process.env.BUKAAFE_PRODUCTION = "1";
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

// Load the SSR module directly from the prebuilt artifact.
async function loadHandleRequest() {
  const mod = (await import("../dist-server/handle-request.js")) as {
    handleRequest: (req: Request) => Promise<Response>;
  };
  return { handleRequest: mod.handleRequest };
}

const app = await createApp({
  staticDir: `${projectRoot}/public`,
  loadHandleRequest,
});

// Vercel serverless function signature: (req, res)
export default function handler(req: any, res: any) {
  // Forward to Express by piping it through the underlying dispatcher.
  app(req, res);
}
