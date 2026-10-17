import { fileURLToPath } from "node:url";
import { createApp } from "./server";

// Local preview that uses the production-built SSR module without Vite.
process.env.NODE_ENV = process.env.NODE_ENV ?? "production";
process.env.BUKAAFE_PRODUCTION = "1";
const projectRoot = fileURLToPath(new URL(".", import.meta.url));

const app = await createApp({
  staticDir: `${projectRoot}/public`,
  loadHandleRequest: async () => {
    const mod = (await import("./dist-server/handle-request.js")) as {
      handleRequest: (req: Request) => Promise<Response>;
    };
    return { handleRequest: mod.handleRequest };
  },
});

const port = Number(process.env.PORT || 3100);
app.listen(port, "0.0.0.0", () => {
  console.log(`布藝咖啡 preview (production) on http://localhost:${port}`);
});
