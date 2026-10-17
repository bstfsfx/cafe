import { createContext, useContext } from "react";

export type NavigateOptions = {
  replace?: boolean;
  preventScrollReset?: boolean;
  popState?: boolean;
};
export type PageNavigate = (to: string, options?: NavigateOptions) => Promise<void>;

export const PageNavigationContext = createContext<PageNavigate | null>(null);

export function useNavigatePage(): PageNavigate {
  const navigate = useContext(PageNavigationContext);
  if (!navigate) throw new Error("useNavigatePage must be used inside PageNavigationContext");
  return navigate;
}
