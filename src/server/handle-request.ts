import {
  createShopifyRequestContext,
  createStorefrontClient,
  gql,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { App } from "../App";
import type { AppEnvelope, ShopRuntime } from "../types";
import { loadPageData } from "./page-data";
import { getCartInitialData, handleCartRequest } from "./cart.server";
import { routeTemplates } from "./route-templates";

const PAGE_DATA_ACCEPT = "application/vnd.bukaafe.page+json";
const STOREFRONT_LOCALE = { country: "TW", language: "ZH_TW" } as const;
const SHOP_RUNTIME_QUERY = gql(`query StorefrontShopRuntime { shop { id } }`);
const shopIdByDomain = new Map<string, Promise<string>>();

type ShopifyRouteSessionManager = {
  getSessionOrigin(): string | Promise<string>;
  getSessionItem(key: string): unknown | Promise<unknown>;
  setSessionItem(key: string, value: unknown): void | Promise<void>;
  removeSessionItem(key: string): void | Promise<void>;
};

function getStoreConfig() {
  const storeDomain = (process.env.PUBLIC_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  const publicStorefrontToken = process.env.PUBLIC_STOREFRONT_API_TOKEN || process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || undefined;
  if (!storeDomain) throw new Error("Shopify store domain is not configured.");
  return { storeDomain, publicStorefrontToken };
}

function createSessionManager(request: Request): ShopifyRouteSessionManager {
  const session = new Map<string, unknown>();
  return {
    getSessionOrigin: () => new URL(request.url).origin,
    getSessionItem: (key) => session.get(key),
    setSessionItem: (key, value) => { session.set(key, value); },
    removeSessionItem: (key) => { session.delete(key); },
  };
}

function secureCartCookie(response: Response, request: Request): Response {
  const cookieHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = cookieHeaders.getSetCookie?.() ?? [];
  if (!cookies.length) return response;

  const url = new URL(request.url);
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (localHttp) return response;

  const updatedCookies = cookies.map((cookie) => {
    if (!/^cart=/i.test(cookie.trim())) return cookie;
    const parts = cookie.split(";").map((part) => part.trim());
    const value = parts.shift() ?? cookie;
    const kept = parts.filter((part) => !/^(path|samesite|secure|httponly|partitioned)(=|$)/i.test(part));
    return [value, ...kept, "Path=/", "HttpOnly", "Secure", "SameSite=None", "Partitioned"].join("; ");
  });
  if (updatedCookies.every((cookie, index) => cookie === cookies[index])) return response;

  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  for (const cookie of updatedCookies) headers.append("set-cookie", cookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function rejectsCrossOriginCartMutation(request: Request): boolean {
  if (request.method !== "POST" || new URL(request.url).pathname !== "/api/cart") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin !== new URL(request.url).origin;
  } catch {
    return true;
  }
}

async function resolveShopId(
  storefrontClient: ReturnType<typeof createStorefrontClient>,
  storeDomain: string,
): Promise<string> {
  const configuredShopId = process.env.SHOP_ID?.trim();
  if (configuredShopId) return configuredShopId;

  const cacheKey = storeDomain.toLowerCase();
  let shopIdPromise = shopIdByDomain.get(cacheKey);
  if (!shopIdPromise) {
    shopIdPromise = (async () => {
      const { data, errors } = await storefrontClient.graphql(SHOP_RUNTIME_QUERY);
      if (errors?.length || !data?.shop?.id) {
        throw new Error("Shopify Storefront API did not return a shop ID.");
      }
      return data.shop.id;
    })();
    shopIdByDomain.set(cacheKey, shopIdPromise);
  }

  try {
    return await shopIdPromise;
  } catch (error) {
    if (shopIdByDomain.get(cacheKey) === shopIdPromise) shopIdByDomain.delete(cacheKey);
    throw error;
  }
}

function shopRuntime(storeDomain: string, shopId: string): ShopRuntime {
  return {
    shopId,
    storefrontId: process.env.PUBLIC_STOREFRONT_ID || "0",
    myshopifyDomain: storeDomain,
    country: "TW",
    language: "ZH_TW",
    currency: "TWD",
    shopName: "布藝咖啡 Fabric & Coffee",
    siteUrl: getPublicSiteOrigin(),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function getPublicSiteOrigin(): string | undefined {
  const configured = process.env.PUBLIC_SITE_URL?.trim();
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function getCanonicalUrl(page: AppEnvelope["page"], siteUrl?: string): string | undefined {
  if (!siteUrl || page.noIndex) return undefined;
  try {
    const origin = new URL(siteUrl);
    const canonical = new URL(page.canonicalPath, origin);
    if (origin.protocol !== "https:" || canonical.origin !== origin.origin) return undefined;
    return canonical.href;
  } catch {
    return undefined;
  }
}

function renderDocument(data: AppEnvelope): string {
  const appHtml = renderToString(createElement(App, { data }));
  const title = escapeHtml(data.page.title);
  const description = escapeHtml(data.page.description);
  const robots = data.page.noIndex ? '<meta name="robots" content="noindex,nofollow">' : "";
  const ogImage = data.page.ogImage ? `<meta property="og:image" content="${escapeHtml(data.page.ogImage)}">` : "";
  const canonicalUrl = getCanonicalUrl(data.page, data.shop.siteUrl);
  const canonical = canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">` : "";
  const ogUrl = canonicalUrl ? `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">` : "";
  const structuredData = [
    canonical,
    ogUrl,
    data.page.structuredData
      ? `<script id="page-structured-data" type="application/ld+json">${escapeJson(data.page.structuredData)}</script>`
      : "",
  ].join("");
  return `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${description}"><meta property="og:type" content="${data.page.ogType ?? "website"}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}">${ogImage}${robots}${structuredData}<meta name="theme-color" content="#f3efe8"><title>${title}</title><link rel="preconnect" href="https://cdn.shopify.com"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/src/styles.css"></head><body><div id="app">${appHtml}</div><script id="__APP_DATA__" type="application/json">${escapeJson(data)}</script><script type="module" src="/src/client.tsx"></script></body></html>`;
}

export async function handleRequest(request: Request): Promise<Response> {
  if (rejectsCrossOriginCartMutation(request)) {
    return new Response("Cross-origin cart mutation rejected.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const { storeDomain, publicStorefrontToken } = getStoreConfig();
  const requestContext = createShopifyRequestContext({ request, i18n: STOREFRONT_LOCALE });
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: { storeDomain, publicStorefrontToken },
  });
  const sessionManager = createSessionManager(request);
  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
  });
  if (shopifyRoute) return secureCartCookie(await shopifyRoute, request);

  const cartResponse = await handleCartRequest(request, storefrontClient, STOREFRONT_LOCALE);
  if (cartResponse) {
    requestContext.applyResponseHeaders(cartResponse.headers);
    return secureCartCookie(cartResponse, request);
  }

  const { page, status } = await loadPageData(request, storefrontClient, storeDomain);
  const cartInitialData = await getCartInitialData(request, storefrontClient, STOREFRONT_LOCALE);
  const shopId = await resolveShopId(storefrontClient, storeDomain);
  const data: AppEnvelope = {
    page,
    shop: shopRuntime(storeDomain, shopId),
    cartInitialData,
  };
  const wantsPageData = request.headers.get("accept")?.includes(PAGE_DATA_ACCEPT) ?? false;
  let response: Response;
  if (wantsPageData) {
    response = new Response(escapeJson(data), {
      status,
      headers: { "content-type": `${PAGE_DATA_ACCEPT}; charset=utf-8`, "cache-control": "private, no-store" },
    });
  } else {
    response = new Response(renderDocument(data), {
      status,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
    });
  }

  if (status === 404) {
    const redirect = await handleShopifyRedirects({ request, storefrontClient, routeTemplates });
    if (redirect) return secureCartCookie(redirect, request);
  }
  requestContext.applyResponseHeaders(response.headers);
  return secureCartCookie(response, request);
}
