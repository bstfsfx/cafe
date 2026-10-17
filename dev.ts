import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);

const vite = await createViteServer({
  root: projectRoot,
  server: { middlewareMode: true, host: "0.0.0.0" },
  appType: "custom",
});

const app = await createApp({
  staticDir: `${projectRoot}/public`,
  loadHandleRequest: () => vite.ssrLoadModule("/src/server/handle-request.ts") as Promise<{ handleRequest: (req: Request) => Promise<Response> }>,
});

// Vite dev middleware for HMR / client transforms.
app.use(vite.middlewares);

// Mount a 500-fallback last for unexpected errors so the dev overlay renders.
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`布藝咖啡 SSR listening on 0.0.0.0:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => void vite.close());
  });
}
