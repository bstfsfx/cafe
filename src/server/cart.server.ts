import {
  createCartCookie,
  createCartServerHandlers,
  getCartId,
  gql,
  parseCartRequest,
  createStorefrontClient,
  type StorefrontApi,
} from "@shopify/hydrogen";

type StorefrontClient = ReturnType<typeof createStorefrontClient>;
export type CartLocale = { country: "TW"; language: "ZH_TW" };

const CART_FRAGMENT = gql(`
  fragment CartFragment on Cart {
    id
    updatedAt
    totalQuantity
    checkoutUrl
    note
    attributes { key value }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      checkoutChargeAmount { amount currencyCode }
    }
    lines(first: 250) {
      nodes {
        id
        quantity
        attributes { key value }
        cost {
          amountPerQuantity { amount currencyCode }
          subtotalAmount { amount currencyCode }
          totalAmount { amount currencyCode }
          compareAtAmountPerQuantity { amount currencyCode }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            sku
            availableForSale
            image { id url altText width height }
            product { id title handle vendor productType }
            selectedOptions { name value }
          }
        }
      }
    }
    discountCodes { applicable code }
  }
`);

const CART_QUERY = gql(`
  query Cart($id: ID!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cart(id: $id) { ...CartFragment }
  }
`, [CART_FRAGMENT]);

const CART_CREATE_MUTATION = gql(`
  mutation CartCreate($input: CartInput!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart { ...CartFragment }
      userErrors { code field message }
      warnings { code message target }
    }
  }
`, [CART_FRAGMENT]);

const CART_LINES_ADD_MUTATION = gql(`
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFragment }
      userErrors { code field message }
      warnings { code message target }
    }
  }
`, [CART_FRAGMENT]);

const CART_LINES_UPDATE_MUTATION = gql(`
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFragment }
      userErrors { code field message }
      warnings { code message target }
    }
  }
`, [CART_FRAGMENT]);

const CART_LINES_REMOVE_MUTATION = gql(`
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFragment }
      userErrors { code field message }
      warnings { code message target }
    }
  }
`, [CART_FRAGMENT]);

type CartData = StorefrontApi.ResultOf<typeof CART_QUERY>["cart"];
type CartEnvelope = { cart: CartData; errors?: Array<{ message: string }> };
type CartMutationEnvelope = {
  cart: CartData;
  userErrors: Array<{ code?: string | null; field?: string[] | null; message: string }>;
  warnings: Array<{ code?: string | null; message: string; target?: string | null }>;
};

// Type witness for Hydrogen's React CartProvider. Runtime reads and writes below use
// the same official Storefront Cart API without requesting selling-plan access.
export declare const cartHandlers: {
  get: (context: unknown) => Promise<{ data: CartEnvelope }>;
};

function assertGraphqlData<T>(result: { data?: T | null; errors?: Array<{ message: string }> }, operation: string): T {
  if (result.errors?.length || !result.data) {
    throw new Error(result.errors?.map((error) => error.message).join("; ") || `${operation} returned no data.`);
  }
  return result.data;
}

function assertMutationPayload<T extends CartMutationEnvelope | null | undefined>(payload: T, operation: string): CartMutationEnvelope {
  if (!payload) throw new Error(`${operation} returned no cart mutation payload.`);
  return {
    cart: payload.cart ?? null,
    userErrors: payload.userErrors ?? [],
    warnings: payload.warnings ?? [],
  };
}

function responseJson(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "private, no-store");
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function getSafeRedirectTarget(request: Request): string {
  const origin = new URL(request.url).origin;
  const referer = request.headers.get("referer");
  if (!referer) return "/";
  try {
    const target = new URL(referer);
    return target.origin === origin ? `${target.pathname}${target.search}${target.hash}` : "/";
  } catch {
    return "/";
  }
}

function formRedirect(request: Request, headers = new Headers()): Response {
  headers.set("location", getSafeRedirectTarget(request));
  headers.set("cache-control", "private, no-store");
  return new Response(null, { status: 303, headers });
}

function errorResponse(request: Request, isFormRequest: boolean, error: unknown): Response {
  if (isFormRequest) return formRedirect(request);
  const message = error instanceof Error ? error.message : "Invalid cart request.";
  return responseJson({ code: "invalid_cart_request", message }, 400);
}

export async function getCartInitialData(
  request: Request,
  storefrontClient: StorefrontClient,
  locale: CartLocale,
): Promise<CartEnvelope> {
  const id = getCartId(request);
  if (!id) return { cart: null };
  try {
    const data = assertGraphqlData(
      await storefrontClient.graphql(CART_QUERY, { variables: { id, ...locale } }),
      "Cart query",
    );
    return { cart: data.cart ?? null };
  } catch (error) {
    console.error("Shopify cart read failed:", error instanceof Error ? error.message : "Unknown error");
    return { cart: null, errors: [{ message: "購物袋暫時無法載入，請重新整理後再試。" }] };
  }
}

export async function handleCartRequest(
  request: Request,
  storefrontClient: StorefrontClient,
  locale: CartLocale,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/cart") return null;

  if (request.method === "GET") {
    const id = getCartId(request);
    if (!id) return responseJson({ cart: null });
    const result = await getCartInitialData(request, storefrontClient, locale);
    return responseJson(result);
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { allow: "GET, POST", "cache-control": "private, no-store" },
    });
  }

  const isFormRequest = !request.headers.get("content-type")?.includes("application/json");
  let parsed: Awaited<ReturnType<typeof parseCartRequest>>;
  try {
    parsed = await parseCartRequest(request);
  } catch (error) {
    return errorResponse(request, isFormRequest, error);
  }

  const cartId = parsed.cartId ?? getCartId(request);
  const variables = locale;
  let payload: CartMutationEnvelope;
  try {
    switch (parsed.action.intent) {
      case "add": {
        if (parsed.action.lines.some((line) => line.sellingPlanId)) {
          return errorResponse(request, isFormRequest, new Error("This storefront does not support subscription plans."));
        }
        if (cartId) {
          const data = assertGraphqlData(
            await storefrontClient.graphql(CART_LINES_ADD_MUTATION, {
              variables: { cartId, lines: parsed.action.lines, ...variables },
            }),
            "Add cart lines",
          );
          payload = assertMutationPayload(data.cartLinesAdd, "cartLinesAdd");
        } else {
          const data = assertGraphqlData(
            await storefrontClient.graphql(CART_CREATE_MUTATION, {
              variables: { input: { lines: parsed.action.lines }, ...variables },
            }),
            "Create cart",
          );
          payload = assertMutationPayload(data.cartCreate, "cartCreate");
        }
        break;
      }
      case "update": {
        if (!cartId) return errorResponse(request, isFormRequest, new Error("No cart exists. Add an item first."));
        const data = assertGraphqlData(
          await storefrontClient.graphql(CART_LINES_UPDATE_MUTATION, {
            variables: { cartId, lines: parsed.action.lines, ...variables },
          }),
          "Update cart lines",
        );
        payload = assertMutationPayload(data.cartLinesUpdate, "cartLinesUpdate");
        break;
      }
      case "remove": {
        if (!cartId) return errorResponse(request, isFormRequest, new Error("No cart exists. Add an item first."));
        const data = assertGraphqlData(
          await storefrontClient.graphql(CART_LINES_REMOVE_MUTATION, {
            variables: { cartId, lineIds: parsed.action.lineIds, ...variables },
          }),
          "Remove cart lines",
        );
        payload = assertMutationPayload(data.cartLinesRemove, "cartLinesRemove");
        break;
      }
      default:
        return errorResponse(request, isFormRequest, new Error("This cart action is not supported."));
    }
  } catch (error) {
    console.error("Shopify cart mutation failed:", error instanceof Error ? error.message : "Unknown error");
    if (isFormRequest) return formRedirect(request);
    return responseJson({ code: "cart_mutation_failed", message: "購物袋更新失敗，請稍後再試。" }, 502);
  }

  const headers = new Headers({ "cache-control": "private, no-store" });
  if (!cartId && payload.cart?.id) headers.append("set-cookie", createCartCookie(payload.cart.id));
  if (isFormRequest) return formRedirect(request, headers);
  return responseJson(payload, 200, headers);
}
