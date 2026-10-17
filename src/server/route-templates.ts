import { createShopifyRouteTemplates } from "@shopify/hydrogen";

// The storefront uses Shopify's default /products, /collections, /search and /cart paths.
// Keep this shared manifest empty until an app-owned route intentionally changes a Shopify path.
export const routeTemplates = createShopifyRouteTemplates({});
