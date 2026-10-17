import type { CartDataFromHandlers, CartGetData } from "@shopify/hydrogen";
import type { cartHandlers } from "./server/cart.server";

export type MoneyData = { amount: string; currencyCode: string };
export type ImageData = {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};
export type VariantData = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
  price: MoneyData;
  compareAtPrice?: MoneyData | null;
  image?: ImageData | null;
  product?: { title?: string | null; handle: string } | null;
  sku?: string | null;
};
export type ProductData = {
  id: string;
  title: string;
  handle: string;
  vendor?: string | null;
  productType?: string | null;
  description: string;
  descriptionHtml: string;
  requiresSellingPlan?: boolean | null;
  featuredImage?: ImageData | null;
  seo?: { title?: string | null; description?: string | null } | null;
  options: Array<{
    name: string;
    optionValues: Array<{
      name: string;
      firstSelectableVariant?: VariantData | null;
      swatch?: unknown;
    }>;
  }>;
  encodedVariantExistence?: string | null;
  encodedVariantAvailability?: string | null;
  selectedOrFirstAvailableVariant: VariantData | null;
  adjacentVariants: VariantData[];
  media: {
    nodes: Array<{
      __typename: string;
      id: string;
      mediaContentType: string;
      alt?: string | null;
      image?: ImageData | null;
      previewImage?: ImageData | null;
    }>;
  };
  priceRange: { minVariantPrice: MoneyData; maxVariantPrice: MoneyData };
};
export type ProductCardData = Pick<ProductData, "id" | "title" | "handle" | "vendor" | "productType" | "featuredImage"> & {
  priceRange: { minVariantPrice: MoneyData };
};
export type CollectionSummary = {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  image?: ImageData | null;
  products?: { nodes: Array<{ featuredImage?: ImageData | null }> };
};
export type ArticleSummary = {
  id: string;
  title: string;
  handle: string;
  excerpt: string;
  publishedAt: string;
  image?: ImageData | null;
  authorV2?: { name: string } | null;
};
export type BlogPageRecord = {
  id: string;
  title: string;
  handle: string;
  articles: { nodes: ArticleSummary[]; pageInfo: { hasNextPage: boolean; endCursor?: string | null } };
};
export type ArticleRecord = ArticleSummary & {
  contentHtml: string;
  seo?: { title?: string | null; description?: string | null } | null;
};
export type AvailableFilter = {
  id: string;
  label: string;
  type: string;
  presentation?: string | null;
  values: Array<{ id: string; label: string; count: number; input: string }>;
};
export type PageBase = {
  kind: string;
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  noIndex?: boolean;
  structuredData?: unknown;
};
export type HomePageData = PageBase & {
  kind: "home";
  shopName: string;
  currencyCode: string;
  collections: CollectionSummary[];
  products: ProductCardData[];
  blog: { id: string; title: string; handle: string; articles: { nodes: ArticleSummary[] } } | null;
};
export type CollectionsPageData = PageBase & {
  kind: "collections";
  currencyCode: string;
  collections: CollectionSummary[];
};
export type CollectionPageData = PageBase & {
  kind: "collection";
  collection: {
    id: string;
    title: string;
    handle: string;
    description: string;
    products: {
      nodes: ProductCardData[];
      filters: AvailableFilter[];
      pageInfo: { hasNextPage: boolean; endCursor?: string | null };
    };
  };
  currencyCode: string;
  queryString: string;
};
export type ProductPageData = PageBase & {
  kind: "product";
  product: ProductData;
  currencyCode: string;
  queryString: string;
};
export type SearchPageData = PageBase & {
  kind: "search";
  term: string;
  currencyCode: string;
  products: ProductCardData[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  queryString: string;
};
export type BlogListingPageData = PageBase & {
  kind: "blog";
  blog: BlogPageRecord;
};
export type BlogArticlePageData = PageBase & {
  kind: "article";
  blog: Pick<BlogPageRecord, "id" | "title" | "handle">;
  article: ArticleRecord;
};
export type CartPageData = PageBase & { kind: "cart" };
export type ManagementPageData = PageBase & {
  kind: "management";
  shopName: string;
  productCount: number;
  collectionCount: number;
  articleCount: number;
  adminLinks: { products: string; collections: string; blogs: string; orders: string };
};
export type NotFoundPageData = PageBase & { kind: "not-found" };

export type PageData =
  | HomePageData
  | CollectionsPageData
  | CollectionPageData
  | ProductPageData
  | SearchPageData
  | BlogListingPageData
  | BlogArticlePageData
  | CartPageData
  | ManagementPageData
  | NotFoundPageData;

export type ShopRuntime = {
  shopId: string;
  storefrontId: string;
  myshopifyDomain: string;
  country: "TW";
  language: "ZH_TW";
  currency: "TWD";
  shopName: string;
  siteUrl?: string;
};

export type ShopifyCartData = CartDataFromHandlers<typeof cartHandlers>;
export type CartInitialData = CartGetData<ShopifyCartData>;
export type AppEnvelope = {
  page: PageData;
  shop: ShopRuntime;
  cartInitialData?: CartInitialData;
};
