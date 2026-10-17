import { createCartComponents } from "@shopify/hydrogen/react";
import type { cartHandlers } from "./server/cart.server";

export const {
  CartProvider,
  useCart,
  useOptionalCart,
  useSuspenseCart,
  useCartActions,
  useCartForm,
} = createCartComponents<typeof cartHandlers>();
