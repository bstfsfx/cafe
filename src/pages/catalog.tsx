import { getFilterRemovalUrl, getSortByValue, isFilterInputActive, serializeCollectionParams, type ProductFilter } from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { CollectionPageData, CollectionsPageData, SearchPageData } from "../types";
import { ProductCard, SectionHeading } from "../components/site";
import { currencySymbol } from "../money";
import { useNavigatePage } from "../navigation";

export function CollectionsPage({ data }: { data: CollectionsPageData }) {
  return (
    <div className="editorial-page">
      <header className="page-masthead page-masthead--dark">
        <p className="eyebrow">SHOP BY CATEGORY</p>
        <h1>按類別選購</h1>
        <p>從布料與成衣輔料，到咖啡豆與沖煮器具，沿著感興趣的材料慢慢探索。</p>
      </header>
      <section className="section">
        <SectionHeading title="商品分類" subtitle="分類與商品內容由 Shopify 即時提供。" />
        {data.collections.length ? (
          <div className="collection-grid">
            {data.collections.map((collection, index) => {
              const image = collection.image ?? collection.products?.nodes[0]?.featuredImage;
              return (
                <article className="collection-card" key={collection.id}>
                  <a href={`/collections/${collection.handle}`} className="collection-card__image">
                    {image ? <img src={image.url} alt={image.altText ?? collection.title} loading="lazy" /> : <span className="image-fallback">布藝咖啡</span>}
                    <span className="collection-card__index">0{index + 1}</span>
                  </a>
                  <div className="collection-card__copy">
                    <p className="eyebrow">COLLECTION {String(index + 1).padStart(2, "0")}</p>
                    <h2><a href={`/collections/${collection.handle}`}>{collection.title}</a></h2>
                    <p>{collection.description || "探索這個 Shopify 商品集合中的選品。"}</p>
                    <a className="text-link" href={`/collections/${collection.handle}`}>瀏覽分類 <span aria-hidden="true">→</span></a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className="empty-panel"><h2>分類整理中</h2><p>商品集合建立後會顯示在這裡。</p></div>}
      </section>
    </div>
  );
}

export function CollectionPage({ data }: { data: CollectionPageData }) {
  const navigate = useNavigatePage();
  return (
    <div className="editorial-page">
      <header className="page-masthead page-masthead--light">
        <p className="eyebrow">SHOP THE COLLECTION</p>
        <h1>{data.collection.title}</h1>
        <p>{data.collection.description}</p>
      </header>
      <CollectionProvider
        key={data.collection.handle}
        data={{ handle: data.collection.handle, dataSearch: data.queryString }}
        urlSearch={data.queryString}
        onChange={(searchString) => {
          const params = new URLSearchParams(data.queryString);
          for (const key of Array.from(params.keys())) {
            if (key.startsWith("filter.") || key === "sort_by" || key === "before" || key === "after") params.delete(key);
          }
          new URLSearchParams(searchString).forEach((value, key) => params.append(key, value));
          const query = params.toString();
          void navigate(`${data.canonicalPath}${query ? `?${query}` : ""}`, { preventScrollReset: true });
        }}
      >
        <CollectionResults data={data} />
      </CollectionProvider>
    </div>
  );
}

function CollectionResults({ data }: { data: CollectionPageData }) {
  const state = useCollection();
  const params = new URLSearchParams(data.queryString);
  const activeFilters = state.filters;
  const currentSort = getSortByValue(state.sortKey ?? "COLLECTION_DEFAULT", state.reverse);
  const nextParams = new URLSearchParams(data.queryString);
  if (data.collection.products.pageInfo.endCursor) nextParams.set("after", data.collection.products.pageInfo.endCursor);
  const productCount = data.collection.products.nodes.length;
  return (
    <section className="section collection-results" aria-labelledby="collection-products-title">
      <div className="collection-toolbar">
        <div><p className="eyebrow">SHOPIFY COLLECTION</p><h2 id="collection-products-title">商品選品</h2><p>{productCount} 件商品</p></div>
        <FilterForm data={data} />
      </div>
      {activeFilters.length ? (
        <div className="active-filter-row" aria-label="目前篩選條件">
          {activeFilters.map((filter, index) => {
            const query = getFilterRemovalUrl(params, filter);
            return <a className="filter-chip" href={`${data.canonicalPath}${query === "?" ? "" : query}`} key={`${index}-${query}`}>{filterLabel(filter)} <span aria-hidden="true">×</span></a>;
          })}
          <a className="text-link" href={clearBrowseParams(data.canonicalPath, data.queryString)}>清除篩選</a>
        </div>
      ) : null}
      <div className={`product-grid${state.status === "loading" ? " product-grid--pending" : ""}`} aria-busy={state.status === "loading"}>
        {data.collection.products.nodes.length ? data.collection.products.nodes.map((product) => <ProductCard key={product.id} product={product} currencyCode={data.currencyCode} />) : <div className="empty-panel empty-panel--grid"><h2>目前沒有符合的商品</h2><p>調整篩選條件，或瀏覽其他分類。</p><a className="text-link" href={clearBrowseParams(data.canonicalPath, data.queryString)}>清除篩選 <span aria-hidden="true">→</span></a></div>}
      </div>
      {data.collection.products.pageInfo.hasNextPage && nextParams.get("after") ? (
        <a className="button button--dark pagination-link" href={`${data.canonicalPath}?${nextParams.toString()}`} data-preserve-scroll="true">載入更多商品 <span aria-hidden="true">→</span></a>
      ) : null}
      <p className="browse-sort-state sr-only" aria-live="polite">排序：{currentSort}</p>
    </section>
  );
}

function FilterForm({ data }: { data: CollectionPageData }) {
  const { formProps } = useCollectionForm();
  const state = useCollection();
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const priceParams = new URLSearchParams(data.queryString);
  const [min, setMin] = useState(priceParams.get("filter.v.price.gte") ?? "");
  const [max, setMax] = useState(priceParams.get("filter.v.price.lte") ?? "");
  const currentPrice = `${priceParams.get("filter.v.price.gte") ?? ""}|${priceParams.get("filter.v.price.lte") ?? ""}`;

  useEffect(() => {
    if (document.activeElement !== minRef.current) setMin(priceParams.get("filter.v.price.gte") ?? "");
    if (document.activeElement !== maxRef.current) setMax(priceParams.get("filter.v.price.lte") ?? "");
  }, [currentPrice]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const submit = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    formRef.current?.requestSubmit();
  };

  const onChange = (event: ChangeEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "number") {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(submit, 350);
      return;
    }
    if ((target instanceof HTMLInputElement && target.type === "checkbox") || target instanceof HTMLSelectElement) submit();
  };

  const priceSymbol = currencySymbol(data.currencyCode, "zh-TW");
  const props = formProps();
  const currentSort = getSortByValue(state.sortKey ?? "COLLECTION_DEFAULT", state.reverse);
  const sortOptions = [
    { key: "COLLECTION_DEFAULT" as const, reverse: false, label: "推薦排序" },
    { key: "BEST_SELLING" as const, reverse: false, label: "最暢銷" },
    { key: "PRICE" as const, reverse: false, label: "價格由低至高" },
    { key: "PRICE" as const, reverse: true, label: "價格由高至低" },
    { key: "CREATED" as const, reverse: true, label: "最新上架" },
  ];

  return (
    <details className="filter-panel">
      <summary>篩選與排序 <span aria-hidden="true">＋</span></summary>
      <form
        {...props}
        ref={formRef}
        method="get"
        action={data.canonicalPath}
        onChange={onChange}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = null;
          (props.onSubmit as ((event: FormEvent<HTMLFormElement>) => void) | undefined)?.(event);
        }}
      >
        <fieldset className="sort-fieldset">
          <legend>排序方式</legend>
          <label htmlFor="collection-sort">排序</label>
          <select id="collection-sort" name="sort_by" value={currentSort} onChange={() => {}}>
            {sortOptions.map((item) => <option key={`${item.key}-${item.reverse}`} value={getSortByValue(item.key, item.reverse)}>{item.label}</option>)}
          </select>
        </fieldset>
        {data.collection.products.filters.map((filter) => {
          if (filter.type === "PRICE_RANGE") {
            return (
              <fieldset className="filter-group" key={filter.id}>
                <legend>{filter.label}</legend>
                <div className="price-range">
                  <label className="price-input"><span aria-hidden="true">{priceSymbol}</span><input ref={minRef} type="number" min="0" step="any" name="filter.v.price.gte" value={min} onChange={(event) => setMin(event.target.value)} aria-label={`最低價格（${data.currencyCode}）`} /></label>
                  <span aria-hidden="true">—</span>
                  <label className="price-input"><span aria-hidden="true">{priceSymbol}</span><input ref={maxRef} type="number" min="0" step="any" name="filter.v.price.lte" value={max} onChange={(event) => setMax(event.target.value)} aria-label={`最高價格（${data.currencyCode}）`} /></label>
                </div>
              </fieldset>
            );
          }
          if (filter.type !== "LIST" && filter.type !== "BOOLEAN") return null;
          return (
            <fieldset className="filter-group" key={filter.id}>
              <legend>{filter.label}</legend>
              <div className="filter-options">
                {filter.values.map((value) => {
                  const serialized = serializeFilterInput(value.input);
                  if (!serialized || serialized.name === "filter.p.category") return null;
                  return (
                    <label className="filter-option" key={value.id}>
                      <input type="checkbox" name={serialized.name} value={serialized.value} defaultChecked={isFilterInputActive(state.filters, value.input)} />
                      <span>{value.label}</span><small>{value.count}</small>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        <noscript><button className="button button--dark" type="submit">更新篩選</button></noscript>
      </form>
    </details>
  );
}

function serializeFilterInput(input: string): { name: string; value: string } | null {
  try {
    const filter = JSON.parse(input) as ProductFilter;
    const entries = Array.from(serializeCollectionParams({ filters: [filter], sortKey: undefined, reverse: false }).entries());
    const item = entries.find(([name]) => name.startsWith("filter."));
    return item ? { name: item[0], value: item[1] } : null;
  } catch {
    return null;
  }
}

function filterLabel(filter: ProductFilter): string {
  const value = filter as unknown as {
    available?: boolean;
    productType?: string;
    productVendor?: string;
    tag?: string;
    variantOption?: { name: string; value: string };
    price?: { min?: { amount: string }; max?: { amount: string } };
  };
  if (value.available !== undefined) return value.available ? "有現貨" : "暫無現貨";
  if (value.productType) return value.productType;
  if (value.productVendor) return value.productVendor;
  if (value.tag) return value.tag;
  if (value.variantOption) return `${value.variantOption.name}：${value.variantOption.value}`;
  if (value.price) return `價格 ${value.price.min?.amount ?? "0"}–${value.price.max?.amount ?? "∞"}`;
  return "已選條件";
}

function clearBrowseParams(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  for (const key of Array.from(params.keys())) {
    if (key.startsWith("filter.") || key === "sort_by" || key === "before" || key === "after") params.delete(key);
  }
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

export function SearchPage({ data }: { data: SearchPageData }) {
  const params = new URLSearchParams(data.queryString);
  if (data.pageInfo.endCursor) params.set("after", data.pageInfo.endCursor);
  return (
    <div className="editorial-page search-page">
      <header className="page-masthead page-masthead--light">
        <p className="eyebrow">FIND YOUR MATERIAL &amp; FLAVOUR</p>
        <h1>搜尋商品</h1>
        <p>以關鍵字探索布料、咖啡與手作選品。</p>
        <form className="search-page__form" action="/search" method="get" role="search">
          <label className="sr-only" htmlFor="product-search">搜尋 Shopify 商品</label>
          <input id="product-search" key={data.term} type="search" name="q" defaultValue={data.term} placeholder="試試「亞麻」或「手沖」" />
          <button className="button button--dark" type="submit">搜尋 <span aria-hidden="true">→</span></button>
        </form>
      </header>
      <section className="section">
        <SectionHeading title={data.term ? `「${data.term}」的搜尋結果` : "輸入關鍵字開始探索"} subtitle={data.term ? `找到 ${data.products.length} 件商品` : "搜尋結果會從 Shopify Storefront API 載入。"} />
        {data.products.length ? (
          <div className="product-grid">{data.products.map((product) => <ProductCard key={product.id} product={product} currencyCode={data.currencyCode} />)}</div>
        ) : data.term ? (
          <div className="empty-panel"><h2>沒有找到相關商品</h2><p>換個關鍵字，或先瀏覽商品分類。</p><a className="text-link" href="/collections">瀏覽所有分類 <span aria-hidden="true">→</span></a></div>
        ) : null}
        {data.pageInfo.hasNextPage && params.get("after") ? <a className="button button--dark pagination-link" href={`/search?${params.toString()}`}>載入更多結果 <span aria-hidden="true">→</span></a> : null}
      </section>
    </div>
  );
}
