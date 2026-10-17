import { formatMoney } from "@shopify/hydrogen";
import type { MoneyData } from "./types";

export function formatPrice(money: MoneyData, locale = "zh-TW"): string {
  return formatMoney(money, { locale }).toString();
}

export function currencySymbol(currencyCode: string, locale = "zh-TW"): string {
  return formatMoney({ amount: "0", currencyCode }, { locale }).currencyNarrowSymbol;
}
