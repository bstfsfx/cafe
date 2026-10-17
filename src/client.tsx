import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import type { AppEnvelope } from "./types";

const root = document.getElementById("app");
const payload = document.getElementById("__APP_DATA__");

if (root && payload?.textContent) {
  const data = JSON.parse(payload.textContent) as AppEnvelope;
  hydrateRoot(root, <App data={data} />);
}
