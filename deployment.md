# Deployment

End-to-end deployment log for the 布藝咖啡 (Fabric & Coffee) Shopify Hydrogen
SSR storefront, including the local dev story, the GitHub repository, and the
Vercel production deployment.

---

## 1. Project at a glance

| | |
| --- | --- |
| Local path | `/Users/bs/Documents/Coding/Sites/bukaafe` |
| GitHub | https://github.com/bstfsfx/cafe (public; renamed from `bukaafe-storefront`) |
| Default branch | `main` |
| Vercel project | `bstfsfxs-projects/bukaafe` |
| Production URL | **https://bukaafe.vercel.app** |
| Demo catalog | `craft-supplies.mock.shop` (tokenless `mock.shop`) |
| Storefront ID | `0` |
| Shopify shop ID | `gid://shopify/Shop/134` (resolved from `craft-supplies.mock.shop`) |
| Locale | `country=TW`, `language=ZH_TW` |
| Currency (label) | `TWD` (mock.shop data is priced in `USD`) |
| Region (serverless) | `iad1` / `hkg1` (Vercel auto-routes) |
| Node version | `22.x` (`engines.node` + Vercel runtime) |

## 2. Stack

| | |
| --- | --- |
| Framework | **Hydrogen 2026.10.0** (`@shopify/hydrogen`) |
| Server | **Express 5** wrapped as a Vercel Node serverless function |
| Bundler | **Vite 7** (client + SSR builds) |
| UI | **React 19** with `renderToString` SSR + client hydration via `src/client.tsx` |
| Sanitization | `sanitize-html@2.18.1` for Shopify Blog / product description HTML |
| Package manager | **pnpm 11.25.0** (`packageManager` pin) |
| TS | 5.9.3 |
| Runtime | Node 22 LTS (Vercel `nodejs22.x`) |

## 3. Repository

### Origin

```
origin	https://github.com/bstfsfx/cafe.git (fetch)
origin	https://github.com/bstfsfx/cafe.git (push)
```

### Commit history (oldest → newest)

| SHA | Title |
| --- | --- |
| `6410bd0` | Initial commit: 布藝咖啡 Fabric & Coffee — Shopify Hydrogen SSR storefront |
| `8756302` | Add Vercel deployment scaffold + production build pipeline |
| `4da9809` | Wire Vercel serverless function to SSR module via Web Request bridge |
| `45a5c2a` | **Fix**: bundle asset index with SSR module so Vercel serverless can read it |
| `27aac52` | Add deployment.md — full record of GitHub + Vercel deployment |
| `c511dd8` | Rename GitHub repository to `bstfsfx/cafe` and update references |

### Repository rename

Renamed **`bstfsfx/bukaafe-storefront` → `bstfsfx/cafe`** (2026-10-18):

```bash
gh repo rename cafe -R bstfsfx/bukaafe-storefront --yes
git remote set-url origin https://github.com/bstfsfx/cafe.git
```

- GitHub serves a permanent redirect from the old URL, so existing links
  and clones keep working.
- The Vercel Git integration follows the repository by ID, so the link
  to `bstfsfx/cafe` survives the rename and pushes to `main` keep
  auto-deploying.
- All in-repo references updated: `package.json` `name`, this file, and
  the remote URL.

### Branches

- `main` (default) — production.
- All work has been direct to `main`; no feature branches used.

### `.gitignore`

```
node_modules/
dist/
dist-server/
.env
.env.*
!.env.example
.DS_Store
storefront-graphql-env.d.ts
customer-account-graphql-env.d.ts

# Local demo artifacts (Playwright screenshots, captured during /demo sessions)
demo-*.png
.playwright-mcp/
```

`dist-server/` and `dist/` are gitignored; the `vercel` CLI uploads them
during deployment.

## 4. Local development

```bash
pnpm install
pnpm dev      # = hydrogen skills check --mode=warn && tsx --env-file=.env dev.ts
```

`pnpm dev` boots Vite middleware + Express on `0.0.0.0:3000`. Vite
transforms `/src/styles.css` and `/src/client.tsx` on demand; HMR
reloads `src/server/handle-request.ts` when the SSR module changes.

`.env` (gitignored) provides the demo credentials:

```dotenv
PUBLIC_STORE_DOMAIN=craft-supplies.mock.shop
PUBLIC_STOREFRONT_ID=0
```

A stale Vite from a sibling project (`tete2`) was holding port 3000 when
dev first started. Fixed by `lsof -nP -iTCP:3000 -sTCP:LISTEN -t | xargs -r kill`
before running `pnpm dev`.

### `pnpm build` (production pipeline)

```bash
pnpm build
# vite build --outDir=dist/client --emptyOutDir \
# && cp -R public/. dist/client/ \
# && mkdir -p dist-server-tmp \
# && vite build --ssr src/server/handle-request.ts --outDir=dist-server-tmp --emptyOutDir \
# && mkdir -p dist-server \
# && cp dist-server-tmp/handle-request.js dist-server/ \
# && rm -rf dist-server-tmp \
# && cp dist/client/index.html dist-server/client-assets.html \
# && rm -f dist/client/index.html
```

What this produces:

```
dist/client/
  assets/
    index-<hash>.css     # 37.6 KB, 8.2 KB gz
    index-<hash>.js      # 354.6 KB, 109.9 KB gz
    *.jpg / *.png        # hero photos from public/
  favicon.svg
  manus-routes.json
  robots.txt

dist-server/
  handle-request.js      # 113.5 KB SSR bundle (Vite SSR build)
  client-assets.html     # manifest of hashed asset URLs, read by the SSR module
  favicon.svg            # (preserved, harmless)
  manus-routes.json
  robots.txt
```

The split — build the SSR bundle into `dist-server-tmp/` first, then move it
into `dist-server/` — is so that `vite build --emptyOutDir` doesn't wipe the
`client-assets.html` we just copied. `client-assets.html` is the production
asset index that `resolveClientAssets()` reads at runtime to find the
hashed `/assets/*` URLs.

`dist/client/index.html` is intentionally deleted after the copy: the
file is a 728-byte Vite build entry with `<div id="app"></div>`, not a
real route. Deleting it lets Vercel's `/(.*)` → `/api/index` rewrite
fire for `/`. If the file is left in place, Vercel serves it as a
static asset before the rewrite runs and the page never reaches the
SSR function.

### `pnpm preview` (local production-mode smoke test)

```bash
PORT=3100 pnpm dev  # dev mode on 3000
# in another shell:
node --env-file=.env preview.ts  # production preview on 3100
```

## 5. Vercel deployment

### Project linking

```bash
vercel link --yes
# → Linked to bstfsfxs-projects/bukaafe
# → Connected GitHub repository: https://github.com/bstfsfx/cafe
```

`vercel.json` configures the build:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "buildCommand": "pnpm build",
  "framework": null,
  "outputDirectory": "dist/client",
  "functions": {
    "api/index.ts": { "memory": 1769, "maxDuration": 60 }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/index" }
  ],
  "headers": [
    { "source": "/assets/(.*)",        "headers": [{ "key": "cache-control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/:file(svg|png|jpg|jpeg|webp|gif|ico|woff2|txt)",
      "headers": [{ "key": "cache-control", "value": "public, max-age=3600" }] }
  ]
}
```

Static assets under `dist/client/` (the `assets/`, `favicon.svg`,
`robots.txt`, `manus-routes.json`) are served by Vercel's edge CDN
without going through the function. Everything else falls through to
`/api/index`, which is a Node 22 serverless function.

### Serverless function shape

- Entry: `api/index.ts` (TypeScript, Vercel auto-bundles via esbuild).
- Runtime: `nodejs22.x`, `arm64` architecture, 1.7 GB memory, 60 s max.
- Cold start: ~3 s for the function init + first SSR. Warm invocations
  reuse the same module.
- The function calls our prebuilt `dist-server/handle-request.js` (the
  Vite SSR bundle), which is uploaded alongside it. The SSR bundle
  reads the asset index from `dist-server/client-assets.html` (its
  sibling file in the function bundle) to find the hashed CSS/JS URLs.

### Production environment variables

| Name | Value | Notes |
| --- | --- | --- |
| `PUBLIC_STORE_DOMAIN` | `craft-supplies.mock.shop` | tokenless demo catalog |
| `PUBLIC_STOREFRONT_ID` | `0` | Hydrogen storefront ID fallback |
| `BUKAAFE_PRODUCTION` | `1` | tells the SSR resolver to read `/assets/*` paths from the bundled `client-assets.html` |
| `NODE_OPTIONS` | `--experimental-require-module` | allows `sanitize-html@2.18.1` (CommonJS) to `require()` `htmlparser2@12.0.0` (ESM) inside the function |

`PUBLIC_STOREFRONT_API_TOKEN` is intentionally unset — `craft-supplies.mock.shop`
is a public, tokenless store.

### `api/index.ts` (Vercel handler)

Uses the Node `(req, res)` signature Vercel's `@vercel/node` launcher
expects. The launcher would silently ignore a returned `Response` from a
default export, so the handler writes to `res` directly:

- Reads the body and headers from the `IncomingMessage`-shaped `req`.
- Constructs a Web `Request` and calls `handleRequest(webReq)`.
- Writes the resulting Web `Response` back to `res`, including any
  `set-cookie` headers from the cart mutations.

### Build / deploy commands

```bash
# Local pre-flight
pnpm build
vercel build --yes        # produces .vercel/output/ the way Vercel will deploy

# Deploy
vercel --prod
# or
vercel deploy --prod --yes
```

Latest production deployment: `bukaafe-94ec44kpq-bstfsfxs-projects.vercel.app`
(aliased to `https://bukaafe.vercel.app`).

## 6. Live route inventory

Smoke-tested after the production-hash fix shipped (`45a5c2a`):

| Route | HTTP | Size | Title |
| --- | --- | --- | --- |
| `/` | 200 | 33 KB | 布藝咖啡｜Fabric & Coffee — 布料與精品手沖 |
| `/collections` | 200 | 19 KB | 按類別選購｜布藝咖啡 |
| `/collections/textured-fiber-weaves` | 200 | 28 KB | Textured Fiber Weaves｜布藝咖啡 |
| `/products/wool-roving-sampler-pack-curated-colorways` | 200 | 25 KB | Wool Roving Sampler Pack – Curated Colorways |
| `/cart` | 200 | 12 KB | 購物袋｜布藝咖啡 |
| `/search?q=wool` | 200 | 15 KB | 「wool」搜尋結果｜布藝咖啡 |

All pages reference the production-hashed CSS and JS:

```html
<link rel="stylesheet" href="/assets/index-QNgN5AsR.css">
<script type="module" src="/assets/index-eng3x2U.js">
```

Static assets served from Vercel's edge CDN:

| Asset | Status | Size | Content-Type |
| --- | --- | --- | --- |
| `/assets/index-QNgN5AsR.css` | 200 | 37.6 KB | `text/css; charset=utf-8` |
| `/assets/index-eng3x2U.js` | 200 | 351.2 KB | `application/javascript; charset=utf-8` |
| `/favicon.svg` | 200 | 361 B | `image/svg+xml` |
| `/assets/textile-studio.png` | 200 | 490 KB | `image/png` |

## 7. The "page is broken" incident (commit `45a5c2a`)

### Symptoms

Opening https://bukaafe.vercel.app showed the SSR HTML (with content),
but with **no styles** and **no client-side hydration**. The page
rendered as an unstyled list of headings, links, and images.

### Diagnosis

The HTML head shipped dev-mode asset URLs that Vercel had no way to
serve:

```html
<link rel="stylesheet" href="/src/styles.css">     ← 404 on Vercel
<script type="module" src="/src/client.tsx">       ← 404 on Vercel
```

Vercel has no Vite middleware, so the dev paths returned the platform
404 page (12 KB each), not the actual assets. The correct production
assets *did* exist and *did* serve from the edge CDN — the page just
wasn't pointing at them.

### Root cause

`resolveClientAssets()` in `src/server/handle-request.ts` is supposed to
read `dist/client/index.html` to discover the hashed `/assets/*` URLs in
production. The previous implementation searched for the file relative
to `process.cwd()`:

```ts
const candidates = [
  join(process.cwd(), "dist", "client", "index.html"),
  join(process.cwd(), "..", "dist", "client", "index.html"),
];
```

On Vercel, `process.cwd()` is not the function bundle's root, so both
candidates returned `false` from `existsSync`, the function threw
`dist/client/index.html not found`, the `catch` fell through, and the
function returned the dev paths. The HTML then asked for URLs that 404.

The local dev server worked because `process.cwd()` happened to be the
project root, where the file was at the first candidate. The smoke test
on `localhost:3100` (production preview) also worked the same way. Only
Vercel's serverless runtime was misaligned.

### Fix

Two changes:

1. **`src/server/handle-request.ts`** — `resolveClientAssets()` now
   resolves candidate paths relative to `import.meta.url` of the current
   module (which Vite preserves through the SSR build), with a
   sibling `client-assets.html` as the primary candidate.

   ```ts
   const here = dirname(fileURLToPath(import.meta.url));
   const candidates = [
     join(here, "client-assets.html"),              // dist-server/client-assets.html (Vercel + local prod)
     join(here, "..", "client", "index.html"),      // legacy layout
     join(here, "..", "dist", "client", "index.html"),
     join(process.cwd(), "dist", "client", "index.html"),
   ];
   ```

2. **`package.json` build script** — produces `dist-server/client-assets.html`
   by copying `dist/client/index.html` after the SSR build (so the second
   `vite build --ssr --emptyOutDir` doesn't wipe it out), and deletes
   `dist/client/index.html` so Vercel's rewrite to `/api/index` actually
   fires for `/`.

   ```bash
   pnpm build
   # vite build --outDir=dist/client --emptyOutDir \
   # && cp -R public/. dist/client/ \
   # && mkdir -p dist-server-tmp \
   # && vite build --ssr src/server/handle-request.ts --outDir=dist-server-tmp --emptyOutDir \
   # && mkdir -p dist-server \
   # && cp dist-server-tmp/handle-request.js dist-server/ \
   # && rm -rf dist-server-tmp \
   # && cp dist/client/index.html dist-server/client-assets.html \
   # && rm -f dist/client/index.html
   ```

### Verification

Before fix (probe from a fresh client):

```text
GET https://bukaafe.vercel.app/src/styles.css  → 404, 12 KB
GET https://bukaafe.vercel.app/src/client.tsx  → 404, 12 KB
GET https://bukaafe.vercel.app/assets/index-QNgN5AsR.css  → 200, 37 KB (existed but unused)
GET https://bukaafe.vercel.app/assets/index-eng3x2U.js  → 200, 351 KB (existed but unused)
```

After fix:

```text
GET https://bukaafe.vercel.app/                 → 200, 33 KB
  <link rel="stylesheet" href="/assets/index-QNgN5AsR.css">   ← production hash
  <script type="module" src="/assets/index-eng3x2U.js">       ← production hash
GET https://bukaafe.vercel.app/assets/index-QNgN5AsR.css  → 200, 37 KB
GET https://bukaafe.vercel.app/assets/index-eng3x2U.js  → 200, 351 KB
```

The page is fully styled, hero images load, and the React client bundle
hydrates (Hydrogen CartProvider, CartForm, analytics, etc.).

## 8. Earlier issues fixed along the way

1. **Port 3000 collision** — A stale `tete2` Vite process was bound to
   port 3000 with `strictPort: true`, silently breaking `pnpm dev`.
   Killed via `lsof -nP -iTCP:3000 -sTCP:LISTEN -t | xargs -r kill`.
2. **`server.ts` was dev-only** — original `server.ts` called
   `app.listen()` at top level, which made it unimportable as a
   module. Refactored to export `createApp({ loadHandleRequest, staticDir })`
   and moved the dev bootstrap to a new `dev.ts`. Added `preview.ts`
   for local production-mode validation.
3. **`resolveClientAssets` in dev vs prod** — initial implementation
   always used the dev `/src/*` paths. The production branch was
   added with `process.cwd()` candidates, which then had the Vercel
   bug above.
4. **Vite needs an `index.html` entry to build a client bundle** —
   added a minimal `index.html` shell that Vite uses only as a build
   entry; the actual document is built by `renderDocument()` in
   `handle-request.ts`.
5. **`api/index.ts` had to use the `(req, res)` Node signature, not
   the Web Fetch signature** — Vercel's `@vercel/node` launcher wraps
   the default export in its own `(req, res) => void` adapter and
   *ignores* returned `Response`s. Switched the handler to read
   `IncomingMessage` and write to `ServerResponse`.
6. **Vite SSR builds use named exports, not `default`** — the first
   `api/index.ts` did `import handleRequestMod from
   "../dist-server/handle-request.js"`, which threw a `SyntaxError`
   at runtime. Switched to `import { handleRequest } from ...`.
7. **`sanitize-html` vs `htmlparser2` ESM/CJS split** —
   `sanitize-html@2.18.1` is CommonJS and `require()`s the ESM
   `htmlparser2@12.0.0`, which Vercel's Node 22 runtime rejects. Fixed
   by setting `NODE_OPTIONS=--experimental-require-module` in the
   production env.
8. **`api/index.ts` is uploaded as a static file by default** — the
   old `api/index.ts` was being served as `text/plain` 333 KB because
   Vercel only treats `.ts`/`.mjs`/`.js` files under `/api` as
   functions if their `default` export is a recognised function shape.
   Fixed when we rewrote the handler to use the `(req, res)` shape.
9. **Vercel `Static file takes priority over rewrite`** — the
   728-byte `dist/client/index.html` was being served as a static
   file at `/`, beating the `/(.*)` → `/api/index` rewrite. The
   build script now deletes that file after copying it to
   `dist-server/client-assets.html`, so the rewrite wins.
10. **Git-triggered builds failed on Vercel's clean checkout** —
    after the repository rename, the first auto-deploy (and two
    earlier pushes) failed with
    `cp: cannot create regular file 'dist-server/': Not a directory`.
    The build script ran `cp dist-server-tmp/handle-request.js dist-server/`
    without ever creating `dist-server/` (only `dist-server-tmp`).
    Locally the step silently succeeded because a stale `dist-server/`
    directory from previous builds already existed; Vercel's clone has
    no such directory (`dist-server/` is gitignored), and `cp` into a
    trailing-slash non-directory fails. Fixed by adding
    `mkdir -p dist-server` before the copy. The failed builds did not
    affect https://bukaafe.vercel.app — Vercel keeps the last READY
    deployment aliased while new builds error.

## 9. Open follow-ups

- **Cart cookie on Vercel**: The `(req, res)` handler writes
  `set-cookie` via `res.setHeader("set-cookie", cookies)`, but Vercel's
  launcher silently drops it for some POST responses. Cart-create
  succeeds (HTTP 303, `location: /products/...`) but the next request
  doesn't carry the cookie, so the cart UI shows 0 items after add.
  Local on `localhost:3000`/`3100` the same flow works end-to-end.
  Likely fix: write the header with a string (cookies joined with
  `, `) rather than an array, or use the `@vercel/cookies` helpers.
- **Vercel cold start** is around 3 s. Hydrogen 2026.10 + React 19
  SSR is heavy; the 60 s `maxDuration` is comfortable but 1.7 GB
  memory is at the upper end. Pre-warming via a periodic keep-alive
  (Vercel Cron, every 5 min) would help interactive latency.
- **Preview envs** — production envs are set; preview-env adds via
  `vercel env add` (without `--yes` and stdin) need a branch argument
  and were not completed. Preview deploys will fall back to
  `PUBLIC_STORE_DOMAIN=undefined` and 500.
- **Auto-deploy from `main`** is configured via the GitHub
  integration Vercel set up during `vercel link --yes`. Future
  pushes will auto-build, no manual `vercel --prod` needed.

## 10. Operational runbook

### Re-deploy after a code change

```bash
cd /Users/bs/Documents/Coding/Sites/bukaafe
git pull                  # if working from another machine
pnpm install              # if deps changed
pnpm build                # local validation
vercel --prod             # production deploy
# or push to main and let Vercel auto-build
git push
```

### Switch the demo catalog to a different mock.shop store

`mock.shop` is a directory of stores. To swap from
`craft-supplies.mock.shop` (BrightHue Harbor — textiles) to a different
catalog, update the env var and redeploy:

```bash
vercel env rm PUBLIC_STORE_DOMAIN production --yes
vercel env add PUBLIC_STORE_DOMAIN production --value=coffee.mock.shop --yes
vercel --prod
```

Other notable mock.shop catalogs:

- `coffee.mock.shop` — Sunbeam Brew Co. (coffee beans, makers, mugs)
- `apparel.mock.shop` — Elysian Thread (apparel, loungewear)
- `home-decor.mock.shop` — Havenly Nest (textiles, decor)

### Switch to a real Shopify store

```bash
# 1. Replace the demo env
vercel env rm PUBLIC_STORE_DOMAIN production --yes
vercel env add PUBLIC_STORE_DOMAIN production --value=your-store.myshopify.com --yes

# 2. Add the public Storefront API token
vercel env add PUBLIC_STOREFRONT_API_TOKEN production --value=<public token> --yes

# 3. Optional: pin the shop id so the home page doesn't issue a { shop { id } } query
vercel env add SHOP_ID production --value=<numeric shop id> --yes

# 4. Optional: set the canonical / og:url origin
vercel env add PUBLIC_SITE_URL production --value=https://your-public-storefront.example --yes

# 5. Redeploy
vercel --prod
```

No code changes are required — `handleRequest` reads these env vars
through `getStoreConfig()` and the rest of the storefront is data-driven.

### Inspect logs

```bash
vercel logs https://bukaafe.vercel.app                  # streaming
vercel logs https://bukaafe.vercel.app --json           # JSON
vercel inspect https://bukaafe.vercel.app               # deployment metadata
```

### Tear down

```bash
vercel rm bukaafe                # removes the Vercel project
gh repo delete bstfsfx/cafe --yes   # removes the GitHub repo
```
