import { getSelectedProductOptions, parseCollectionParams, type InferVariables, type StorefrontClient } from "@shopify/hydrogen";
import sanitizeHtml from "sanitize-html";
import type { PageData } from "../types";
import {
  ARTICLE_QUERY,
  BLOG_QUERY,
  COLLECTIONS_QUERY,
  COLLECTION_PAGE_QUERY,
  HOME_QUERY,
  MANAGEMENT_QUERY,
  PRODUCT_QUERY,
  SEARCH_QUERY,
} from "./queries";

const COUNTRY = "TW";
const LANGUAGE = "ZH_TW";

export class StorefrontQueryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "StorefrontQueryError";
  }
}

function assertNoGraphqlErrors(label: string, errors: unknown): void {
  if (Array.isArray(errors) && errors.length > 0) {
    console.error(`[hydrogen] ${label} query failed`, errors);
    throw new StorefrontQueryError(`${label} query failed`);
  }
}

function text(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function summary(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function shopifyAdminLinks(storeDomain: string) {
  const origin = new URL(`https://${storeDomain}`);
  if (origin.username || origin.password || !origin.hostname.endsWith(".myshopify.com")) {
    throw new StorefrontQueryError("Shopify Admin links require the configured myshopify.com domain.");
  }
  return {
    products: new URL("/admin/products", origin).href,
    collections: new URL("/admin/collections", origin).href,
    blogs: new URL("/admin/content/blogs", origin).href,
    orders: new URL("/admin/orders", origin).href,
  };
}

function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "address", "article", "b", "blockquote", "br", "caption", "cite", "code", "dd", "del", "div",
      "dl", "dt", "em", "figcaption", "figure", "h2", "h3", "h4", "hr", "i", "img", "li", "ol",
      "p", "pre", "s", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead",
      "tr", "u", "ul",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      table: ["border", "cellpadding", "cellspacing"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }, true),
    },
  });
}

function notFoundPage(pathname: string): PageData {
  return {
    kind: "not-found",
    title: "找不到頁面｜布藝咖啡",
    description: "這個頁面不存在，請回到首頁或繼續探索商品。",
    canonicalPath: pathname,
    noIndex: true,
  };
}

function visibleCollections<T extends { handle: string }>(collections: T[]): T[] {
  return collections.filter((collection) => !["frontpage", "all"].includes(collection.handle.toLowerCase()));
}

export async function loadPageData(
  request: Request,
  storefrontClient: StorefrontClient,
  storeDomain: string,
): Promise<{ page: PageData; status: number }> {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const locale = { country: COUNTRY, language: LANGUAGE };

  if (pathname === "/") {
    const { data, errors } = await storefrontClient.graphql(HOME_QUERY, { variables: locale });
    assertNoGraphqlErrors("Home", errors);
    if (!data) throw new StorefrontQueryError("Home query returned no data");
    const firstArticle = data.blog?.articles.nodes[0];
    return {
      status: 200,
      page: {
        kind: "home",
        title: "布藝咖啡｜Fabric & Coffee — 布料與精品手沖",
        description: "在香港深水埗，讓布料工藝與精品咖啡相遇。探索手感選材、手沖風味與日常工作坊。",
        canonicalPath: "/",
        ogImage: firstArticle?.image?.url ?? undefined,
        ogType: "website",
        shopName: data.shop.name,
        currencyCode: data.localization.country?.currency?.isoCode ?? "TWD",
        collections: visibleCollections(data.collections.nodes),
        products: data.products.nodes,
        blog: data.blog ? {
          ...data.blog,
          articles: { ...data.blog.articles, nodes: data.blog.articles.nodes.map((article) => ({ ...article, excerpt: article.excerpt ?? "" })) },
        } : null,
      },
    };
  }

  if (pathname === "/collections") {
    const { data, errors } = await storefrontClient.graphql(COLLECTIONS_QUERY, { variables: locale });
    assertNoGraphqlErrors("Collections", errors);
    if (!data) throw new StorefrontQueryError("Collections query returned no data");
    return {
      status: 200,
      page: {
        kind: "collections",
        title: "按類別選購｜布藝咖啡",
        description: "探索布藝材料、咖啡器具與風味選品，從 Shopify 商品集合開始選購。",
        canonicalPath: pathname,
        ogType: "website",
        currencyCode: data.localization.country?.currency?.isoCode ?? "TWD",
        collections: visibleCollections(data.collections.nodes),
      },
    };
  }

  const collectionMatch = pathname.match(/^\/collections\/([^/]+)$/);
  if (collectionMatch) {
    const handle = decodeURIComponent(collectionMatch[1]);
    const parsed = parseCollectionParams(searchParams);
    const filters = parsed.filters as unknown as NonNullable<InferVariables<typeof COLLECTION_PAGE_QUERY>["filters"]>;
    const { data, errors } = await storefrontClient.graphql(COLLECTION_PAGE_QUERY, {
      variables: {
        ...locale,
        handle,
        after: searchParams.get("after"),
        filters,
        sortKey: parsed.sortKey,
        reverse: parsed.reverse,
      },
    });
    assertNoGraphqlErrors("Collection", errors);
    const collection = data?.collection;
    if (!collection) return { status: 404, page: notFoundPage(pathname) };
    return {
      status: 200,
      page: {
        kind: "collection",
        title: `${collection.title}｜布藝咖啡`,
        description: text(collection.description, `瀏覽「${collection.title}」Shopify 商品集合，查看商品圖片、價格與可用款式。`),
        canonicalPath: pathname,
        ogType: "website",
        currencyCode: data.localization.country?.currency?.isoCode ?? "TWD",
        collection: {
          ...collection,
          description: collection.description ?? "",
          products: { ...collection.products, filters: collection.products.filters ?? [] },
        },
        queryString: url.search,
      },
    };
  }

  if (pathname === "/search") {
    const term = (searchParams.get("q") ?? "").trim().slice(0, 120);
    if (!term) {
      return {
        status: 200,
        page: {
          kind: "search",
          title: "搜尋商品｜布藝咖啡",
          description: "搜尋布料、咖啡與手作選品。",
          canonicalPath: pathname,
          noIndex: true,
          term,
          currencyCode: "TWD",
          products: [],
          pageInfo: { hasNextPage: false },
          queryString: url.search,
        },
      };
    }
    const { data, errors } = await storefrontClient.graphql(SEARCH_QUERY, {
      variables: { ...locale, query: term, after: searchParams.get("after") },
    });
    assertNoGraphqlErrors("Search", errors);
    if (!data) throw new StorefrontQueryError("Search query returned no data");
    const products = data.search.nodes.flatMap((node) => node.__typename === "Product" ? [node] : []);
    return {
      status: 200,
      page: {
        kind: "search",
        title: `「${term}」搜尋結果｜布藝咖啡`,
        description: `搜尋「${term}」的布藝材料與精品咖啡選品。`,
        canonicalPath: pathname,
        noIndex: true,
        ogType: "website",
        term,
        currencyCode: data.localization.country?.currency?.isoCode ?? "TWD",
        products,
        pageInfo: data.search.pageInfo,
        queryString: url.search,
      },
    };
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const handle = decodeURIComponent(productMatch[1]);
    const selectedOptions = getSelectedProductOptions({ searchParams });
    const { data, errors } = await storefrontClient.graphql(PRODUCT_QUERY, {
      variables: { ...locale, handle, selectedOptions },
    });
    assertNoGraphqlErrors("Product", errors);
    const product = data?.product;
    if (!product) return { status: 404, page: notFoundPage(pathname) };
    const safeProduct = { ...product, descriptionHtml: sanitizeArticleHtml(product.descriptionHtml) };
    const price = product.selectedOrFirstAvailableVariant?.price ?? product.priceRange.minVariantPrice;
    const imageUrl = product.featuredImage?.url ?? product.media.nodes.find((node) => node.__typename === "MediaImage")?.image?.url;
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: summary(product.description),
      image: imageUrl ? [imageUrl] : undefined,
      sku: product.selectedOrFirstAvailableVariant?.sku ?? undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: price.currencyCode,
        price: price.amount,
        availability: product.selectedOrFirstAvailableVariant?.availableForSale
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: request.url,
      },
    };
    return {
      status: 200,
      page: {
        kind: "product",
        title: text(product.seo?.title, `${product.title}｜布藝咖啡`),
        description: text(product.seo?.description, summary(product.description)),
        canonicalPath: pathname,
        ogImage: imageUrl,
        ogType: "product",
        structuredData,
        product: safeProduct,
        currencyCode: data.localization.country?.currency?.isoCode ?? price.currencyCode,
        queryString: url.search,
      },
    };
  }

  const blogMatch = pathname.match(/^\/blogs\/([^/]+)$/);
  if (blogMatch) {
    const handle = decodeURIComponent(blogMatch[1]);
    const { data, errors } = await storefrontClient.graphql(BLOG_QUERY, {
      variables: { ...locale, handle, after: searchParams.get("after") },
    });
    assertNoGraphqlErrors("Blog", errors);
    const blog = data?.blog;
    if (!blog) return { status: 404, page: notFoundPage(pathname) };
    return {
      status: 200,
      page: {
        kind: "blog",
        title: `${blog.title}｜布藝咖啡 Fabric & Coffee`,
        description: "關於選布、手作與手沖咖啡的日常筆記。閱讀布藝咖啡誌最新文章。",
        canonicalPath: pathname,
        ogImage: blog.articles.nodes[0]?.image?.url,
        ogType: "website",
        blog: {
          ...blog,
          articles: { ...blog.articles, nodes: blog.articles.nodes.map((article) => ({ ...article, excerpt: article.excerpt ?? "" })) },
        },
      },
    };
  }

  const articleMatch = pathname.match(/^\/blogs\/([^/]+)\/([^/]+)$/);
  if (articleMatch) {
    const blogHandle = decodeURIComponent(articleMatch[1]);
    const articleHandle = decodeURIComponent(articleMatch[2]);
    const { data, errors } = await storefrontClient.graphql(ARTICLE_QUERY, {
      variables: { ...locale, blogHandle, articleHandle },
    });
    assertNoGraphqlErrors("Blog article", errors);
    const blog = data?.blog;
    const article = blog?.articleByHandle;
    if (!blog || !article) return { status: 404, page: notFoundPage(pathname) };
    const safeContent = sanitizeArticleHtml(article.contentHtml);
    const articleImage = article.image?.url;
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      datePublished: article.publishedAt,
      author: { "@type": "Organization", name: "布藝咖啡編輯部" },
      image: articleImage ? [articleImage] : undefined,
      mainEntityOfPage: request.url,
      publisher: { "@type": "Organization", name: "布藝咖啡 Fabric & Coffee" },
    };
    return {
      status: 200,
      page: {
        kind: "article",
        title: text(article.seo?.title, `${article.title}｜${blog.title}`),
        description: text(article.seo?.description, summary(article.excerpt ?? "")),
        canonicalPath: pathname,
        ogImage: articleImage,
        ogType: "article",
        structuredData,
        blog: { id: blog.id, title: blog.title, handle: blog.handle },
        article: { ...article, excerpt: article.excerpt ?? "", contentHtml: safeContent },
      },
    };
  }

  if (pathname === "/cart") {
    return {
      status: 200,
      page: {
        kind: "cart",
        title: "購物袋｜布藝咖啡",
        description: "查看及調整購物袋中的 Shopify 商品，準備前往安全結帳。",
        canonicalPath: pathname,
        noIndex: true,
      },
    };
  }

  if (pathname === "/management") {
    const { data, errors } = await storefrontClient.graphql(MANAGEMENT_QUERY, { variables: locale });
    assertNoGraphqlErrors("Management", errors);
    if (!data) throw new StorefrontQueryError("Management query returned no data");
    return {
      status: 200,
      page: {
        kind: "management",
        title: "店主管理主控台｜布藝咖啡",
        description: "以 Shopify Admin 管理布藝咖啡的商品、分類、文章與訂單。",
        canonicalPath: pathname,
        noIndex: true,
        adminLinks: shopifyAdminLinks(storeDomain),
        shopName: data.shop.name,
        productCount: data.products.nodes.length,
        collectionCount: visibleCollections(data.collections.nodes).length,
        articleCount: data.blog?.articles.nodes.length ?? 0,
      },
    };
  }

  return { status: 404, page: notFoundPage(pathname) };
}
