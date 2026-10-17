# 布藝咖啡 Fabric & Coffee

布藝咖啡店面 — a Hong Kong craft-and-coffee concept rendered as a server-side-rendered Shopify Storefront in Traditional Chinese (zh-Hant-TW).

The storefront is built on **Shopify Hydrogen 2026.10** with **Express** + **Vite** + **React 19**. Pages render on the server (`renderToString`) with full hydration for interactive controls; product and cart data come from the Shopify Storefront API. The cart is server-side backed by an `HttpOnly` cookie and the official Hydrogen cart actions.

## Routes

| Path | Description |
| --- | --- |
| `/` | Bilingual home: hero, category CTAs, brand story, workshops, latest news, featured products |
| `/collections` | All Shopify collections (excludes `frontpage` / `all`) |
| `/collections/:handle` | A collection's product grid with sort + filter |
| `/products/:handle` | Product detail page with variant picker, quantity stepper, add-to-cart |
| `/search` | Live product search (`?q=…`) |
| `/cart` | Server-side cart with line items, qty `−`/`+`/`移除`, totals, secure checkout |
| `/blogs/:handle` & `/blogs/:handle/:article` | Shopify Blog list and article (HTML sanitized) |
| `/management` | Operator dashboard with admin.shopify.com entry-points (refuses to render against non-myshopify domains) |

## Stack

- **Hydrogen 2026.10** — `createStorefrontClient`, `handleShopifyRoutes`, `gql`, `createShopifyRequestContext`
- **Express 5** — server / middleware bridge
- **Vite 7** — SSR transformer + bundler (in dev) + React plugin
- **React 19** — `renderToString` SSR + client hydration via `src/client.tsx`
- **`sanitize-html`** — whitelist-stripped Shopify Blog article / product description HTML
- **Node 22+** required (for `--env-file`)

## Local development

```bash
pnpm install
pnpm dev        # = hydrogen skills check && tsx --env-file=.env server.ts
```

The Hydrogen skill check warns when local skills fall behind the bundled
Hydrogen version. Run `npx @shopify/hydrogen skills sync` to refresh.

### Demo mode (no Shopify account required)

Without real Shopify credentials the storefront still demo-fine against a
public tokenless `mock.shop` catalog. Copy `.env.example` to `.env` and set:

```dotenv
PUBLIC_STORE_DOMAIN=craft-supplies.mock.shop
```

Restart `pnpm dev`. Carts work, blog routes 404 (mock.shop has no blog),
and the `/management` page refuses to render against a non-myshopify
domain — that's by design.

### Production / real store

```dotenv
PUBLIC_STORE_DOMAIN=your-store.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN=<public Storefront API token>
SHOP_ID=<numeric shop id, optional — otherwise resolved from { shop { id } }>
PUBLIC_SITE_URL=https://your-public-storefront.example  # only when you have a real HTTPS origin
```

Restart the dev server after editing `.env`. Tokenless access is supported by
mock.shop only; real stores always need a public token.

## Deployment

### Vercel

`vercel.json` routes every non-static request to the serverless function in
`api/index.ts`, which wraps the same Express app used in dev. Set the env
vars above (or use `vercel env`) before the first deploy.

```bash
vercel env add PUBLIC_STORE_DOMAIN            # production
vercel env add PUBLIC_STOREFRONT_API_TOKEN    # production (blank for mock.shop)
vercel --prod
```

### Shopify Oxygen (recommended target for real Hydrogen apps)

The Hydrogen bundler in `.agents/skills/hydrogen-oxygen` walks through
converting the same source tree for Oxygen / MiniOxygen.

## Project layout

```
server.ts                  # Express+Vite SSR listener (dev) and Vercel function target
api/index.ts               # Vercel serverless entrypoint (wraps server.ts logic)
vercel.json                # Vercel build / routing config
src/
  App.tsx                  # Root React app, page-data envelope shape
  client.tsx               # Hydration entry (CartProvider + BrowserRouter)
  styles.css               # Global responsive design tokens + components
  navigation.tsx           # Top nav, mobile menu
  money.ts                 # MoneyV2 formatter
  types.ts                 # AppEnvelope, ShopRuntime
  product.ts               # CartForm + CartProvider bindings
  pages/                   # One file per page kind: home, catalog, product, cart, blog*, management
  components/site.tsx      # Shared layout, footer, product card, brand mark
  server/
    handle-request.ts      # Hydrogen request handlers + SSR document
    page-data.ts           # GraphQL → PageData loaders per route + /management
    cart.server.ts         # Storefront Cart API + /api/cart mutations
    queries.ts             # GraphQL documents
    route-templates.ts     # Hydrogen routeTemplates for redirects
public/
  favicon.svg, robots.txt, manus-routes.json, assets/
```

## Design notes

The visual language follows `plan.md`:

- Warm off-white (`#f3efe8`-ish) linen background; deep tea-brown `#6B4C38` brand colour.
- Bilingual nav (zh-Hant + EN subline), Chinese display headlines, English nav and prices.
- Editorial asymmetric layout, dark brand-story section, photo-led cards.
- Reduced-motion friendly (only short fades / soft shifts; no parallax or loops).
- Type uses system Chinese Song/Ming for display and Hei for UI; English serif headlines.
- All Shopify Blog HTML is sanitized through a whitelist before render. `canonical` and `og:url` only emit when `PUBLIC_SITE_URL` is a valid HTTPS origin; otherwise the page omits them rather than guessing a domain.

## License & credits

Project plumbing by the human author. Catalog for demo mode comes from
[mock.shop](https://mock.shop/) — public, tokenless Storefront API for
prototyping Hydrogen storefronts.
