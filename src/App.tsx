import { useCallback, useEffect, useState } from "react";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import { CartProvider, useCartActions } from "./cart";
import { SiteFooter, SiteHeader } from "./components/site";
import { HomePage } from "./pages/home";
import { CollectionsPage, CollectionPage, SearchPage } from "./pages/catalog";
import { ProductPage } from "./pages/product-page";
import { CartPage } from "./pages/cart-page";
import { BlogArticlePage, BlogListingPage } from "./pages/blog-pages";
import { ManagementPage } from "./pages/management-page";
import { PageNavigationContext, type PageNavigate } from "./navigation";
import { routeTemplates } from "./server/route-templates";
import type { AppEnvelope, CollectionSummary, PageData } from "./types";

const PAGE_DATA_ACCEPT = "application/vnd.bukaafe.page+json";

export function App({ data }: { data: AppEnvelope }) {
  return (
    <CartProvider initialData={data.cartInitialData}>
      <InteractiveApp initialData={data} />
    </CartProvider>
  );
}

function InteractiveApp({ initialData }: { initialData: AppEnvelope }) {
  const [data, setData] = useState(initialData);
  const refreshCart = useCartActions().refresh;

  const navigate = useCallback<PageNavigate>(async (to, options = {}) => {
    if (typeof window === "undefined") return;
    const destination = new URL(to, window.location.href);
    const fullDocumentRoutes = ["/admin", "/checkout"];
    if (
      destination.origin !== window.location.origin ||
      fullDocumentRoutes.some((path) => destination.pathname === path || destination.pathname.startsWith(`${path}/`)) ||
      destination.pathname.startsWith("/buy/") || /^\/cart\/[^/]+:\d+/.test(destination.pathname)
    ) {
      if (options.replace) window.location.replace(destination.href);
      else window.location.assign(destination.href);
      return;
    }

    const pageUrl = `${destination.pathname}${destination.search}`;
    try {
      const response = await fetch(pageUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: PAGE_DATA_ACCEPT },
      });
      if (!response.ok && response.status !== 404) throw new Error(`Page request failed: ${response.status}`);
      const nextData = await response.json() as AppEnvelope;
      if (!nextData?.page || !nextData.shop) throw new Error("Invalid page response");

      if (!options.popState) {
        if (options.replace) window.history.replaceState({}, "", destination.href);
        else window.history.pushState({}, "", destination.href);
      }
      setData(nextData);
      syncDocumentHead(nextData.page, nextData.shop.siteUrl);
      if (destination.pathname === "/cart") refreshCart();
      if (!options.preventScrollReset) {
        window.requestAnimationFrame(() => {
          if (destination.hash) document.getElementById(decodeURIComponent(destination.hash.slice(1)))?.scrollIntoView();
          else window.scrollTo({ top: 0, behavior: "auto" });
        });
      }
    } catch (error) {
      console.error("Storefront navigation fell back to a full page load:", error);
      if (options.popState) window.location.reload();
      else if (options.replace) window.location.replace(destination.href);
      else window.location.assign(destination.href);
    }
  }, [refreshCart]);

  useEffect(() => {
    const handlePopState = () => {
      void navigate(`${window.location.pathname}${window.location.search}${window.location.hash}`, {
        popState: true,
        preventScrollReset: true,
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  const shopifyNavigate = useCallback((url: string) => navigate(url), [navigate]);
  const collections = collectionsForPage(data.page);

  return (
    <PageNavigationContext.Provider value={navigate}>
      <ShopifyScripts
        shop={{
          shopId: data.shop.shopId,
          storefrontId: data.shop.storefrontId,
          myshopifyDomain: data.shop.myshopifyDomain,
        }}
        i18n={{ country: data.shop.country, language: data.shop.language, currency: data.shop.currency }}
        routes={routeTemplates}
        navigate={shopifyNavigate}
      />
      <SiteHeader collections={collections} />
      <main id="main-content" data-page={data.page.kind}>
        {renderPage(data.page)}
      </main>
      <SiteFooter />
    </PageNavigationContext.Provider>
  );
}

function collectionsForPage(page: PageData): CollectionSummary[] {
  if (page.kind === "home" || page.kind === "collections") return page.collections;
  return [];
}

function renderPage(page: PageData) {
  switch (page.kind) {
    case "home": return <HomePage data={page} />;
    case "collections": return <CollectionsPage data={page} />;
    case "collection": return <CollectionPage data={page} />;
    case "product": return <ProductPage data={page} />;
    case "search": return <SearchPage data={page} />;
    case "cart": return <CartPage />;
    case "blog": return <BlogListingPage data={page} />;
    case "article": return <BlogArticlePage data={page} />;
    case "management": return <ManagementPage data={page} />;
    case "not-found": return <NotFoundPage page={page} />;
  }
}

function NotFoundPage({ page }: { page: Extract<PageData, { kind: "not-found" }> }) {
  return (
    <section className="page-masthead page-masthead--dark not-found-page">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>{page.title}</h1>
      <p>{page.description}</p>
      <a className="button button--light" href="/">回到首頁 <span aria-hidden="true">→</span></a>
    </section>
  );
}

function syncDocumentHead(page: PageData, siteUrl?: string): void {
  document.title = page.title;
  let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!description) {
    description = document.createElement("meta");
    description.name = "description";
    document.head.append(description);
  }
  description.content = page.description;
  let canonicalUrl: string | undefined;
  if (!page.noIndex && siteUrl) {
    try {
      const origin = new URL(siteUrl);
      const canonical = new URL(page.canonicalPath, origin);
      if (origin.protocol === "https:" && !origin.username && !origin.password && canonical.origin === origin.origin) {
        canonicalUrl = canonical.href;
      }
    } catch {
      canonicalUrl = undefined;
    }
  }
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonicalUrl) {
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;
  } else canonical?.remove();

  let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (canonicalUrl) {
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.append(ogUrl);
    }
    ogUrl.content = canonicalUrl;
  } else ogUrl?.remove();

  for (const [property, content] of [["og:title", page.title], ["og:description", page.description], ["og:type", page.ogType ?? "website"]] as const) {
    let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", property);
      document.head.append(meta);
    }
    meta.content = content;
  }
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (page.noIndex) {
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.append(robots);
    }
    robots.content = "noindex,nofollow";
  } else {
    robots?.remove();
  }
  const image = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
  if (page.ogImage) {
    if (image) image.content = page.ogImage;
    else {
      const nextImage = document.createElement("meta");
      nextImage.setAttribute("property", "og:image");
      nextImage.content = page.ogImage;
      document.head.append(nextImage);
    }
  } else image?.remove();
  let structuredData = document.getElementById("page-structured-data") as HTMLScriptElement | null;
  if (page.structuredData) {
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.id = "page-structured-data";
      structuredData.type = "application/ld+json";
      document.head.append(structuredData);
    }
    structuredData.textContent = JSON.stringify(page.structuredData).replace(/</g, "\\u003c");
  } else structuredData?.remove();
}
