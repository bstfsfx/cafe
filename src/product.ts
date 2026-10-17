import { createProductComponents } from "@shopify/hydrogen/react";
import type { ProductData } from "./types";

export const { ProductProvider, useProduct, useProductForm } = createProductComponents<ProductData>();
