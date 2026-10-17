import { buildProductSelectionSearchParams, canAddToCart } from "@shopify/hydrogen";
import { useProductForm, ProductProvider } from "../product";
import type { ProductPageData, ImageData } from "../types";
import { useNavigatePage } from "../navigation";
import { formatPrice } from "../money";

export function ProductPage({ data }: { data: ProductPageData }) {
  const navigate = useNavigatePage();
  const product = data.product;
  const optionNames = product.options.map((option) => option.name);
  return (
    <div className="product-page">
      <nav className="breadcrumbs" aria-label="麵包屑導覽">
        <a href="/">首頁</a><span aria-hidden="true">/</span><a href="/collections">商品分類</a><span aria-hidden="true">/</span><span aria-current="page">{product.title}</span>
      </nav>
      <ProductProvider
        product={product}
        onSelect={(result) => {
          const params = buildProductSelectionSearchParams({
            selectedOptions: result.selectedOptions,
            optionNames,
            base: new URLSearchParams(data.queryString),
          });
          const path = `/products/${product.handle}${params.size ? `?${params.toString()}` : ""}`;
          void navigate(path, { replace: true, preventScrollReset: true });
        }}
      >
        <ProductPageContent data={data} />
      </ProductProvider>
    </div>
  );
}

function ProductPageContent({ data }: { data: ProductPageData }) {
  const product = data.product;
  const { options, selectedVariant, formProps, register, errors, pending } = useProductForm();
  const addAllowed = canAddToCart(product, options);
  const images = getProductImages(product.media.nodes.map((node) => node.__typename === "MediaImage" && node.image ? node.image : null).filter((image): image is ImageData => Boolean(image)));
  if (!images.length && product.featuredImage) images.push(product.featuredImage);
  const currentPrice = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const errorMessages = [...errors.userErrors, ...errors.warnings, ...errors.networkErrors].map((error) => error.message).filter(Boolean);

  return (
    <>
      <section className="product-detail">
        <div className="product-gallery">
          {images.length ? images.map((image, index) => (
            <figure className={`product-gallery__image${index === 0 ? " product-gallery__image--hero" : ""}`} key={`${image.url}-${index}`}>
              <img src={image.url} alt={image.altText ?? product.title} fetchPriority={index === 0 ? "high" : undefined} loading={index === 0 ? "eager" : "lazy"} />
            </figure>
          )) : <div className="product-gallery__fallback">布藝咖啡<br />Fabric &amp; Coffee</div>}
        </div>
        <div className="product-detail__copy">
          <p className="eyebrow">{product.productType || "FABRIC & COFFEE SELECT"}</p>
          {product.vendor ? <p className="product-detail__vendor">{product.vendor}</p> : null}
          <h1>{product.title}</h1>
          <p className="product-detail__price">{formatPrice(currentPrice, "zh-TW")}</p>
          {selectedVariant?.compareAtPrice ? <p className="product-detail__compare">原價 {formatPrice(selectedVariant.compareAtPrice, "zh-TW")}</p> : null}
          {selectedVariant ? <p className={`stock-note${selectedVariant.availableForSale ? "" : " stock-note--out"}`}>{selectedVariant.availableForSale ? "現貨供應" : "暫時售罄"}</p> : null}

          {options.some((option) => option.values.length > 1) ? <VariantPicker product={product} options={options} queryString={data.queryString} /> : null}

          <form className="add-to-cart-form" {...formProps()}>
            <input type="hidden" {...register("merchandiseId", {})} />
            <label htmlFor="product-quantity">數量</label>
            <input id="product-quantity" className="quantity-input" type="number" min="1" step="1" {...register("quantity", { defaultValue: 1 })} />
            <button className="button button--dark" {...register("addToCart", {})} disabled={!addAllowed || pending} aria-busy={pending} aria-describedby={errorMessages.length ? "product-cart-errors" : undefined}>
              {pending ? "正在加入…" : !selectedVariant ? "選擇款式" : !selectedVariant.availableForSale ? "暫時售罄" : product.requiresSellingPlan ? "目前無法購買" : "加入購物袋"}
              {!pending ? <span aria-hidden="true">→</span> : null}
            </button>
          </form>
          {errorMessages.length ? <ul className="form-errors" id="product-cart-errors" role="alert">{errorMessages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul> : null}
          <div className="product-description rte" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
          <p className="product-detail__note">價格與可售狀態以 Shopify 商品資料為準；完成購買將前往 Shopify Checkout。</p>
        </div>
      </section>
    </>
  );
}

function VariantPicker({ product, options, queryString }: {
  product: ProductPageData["product"];
  options: ReturnType<typeof useProductForm>["options"];
  queryString: string;
}) {
  const { register } = useProductForm();
  const optionNames = product.options.map((option) => option.name);
  const base = new URLSearchParams(queryString);

  return (
    <div className="variant-picker">
      {options.map((option) => (
        <fieldset className="variant-picker__group" key={option.name}>
          <legend>{option.name}</legend>
          <div className="variant-picker__values">
            {option.values.map((value) => {
              const params = buildProductSelectionSearchParams({ selectedOptions: value.selectedOptions, optionNames, base });
              const href = `/products/${value.handle || product.handle}${params.size ? `?${params.toString()}` : ""}`;
              const soldOut = value.exists && value.available === false;
              if (!value.exists) {
                return <button className="variant-option variant-option--unavailable" type="button" key={value.name} disabled aria-pressed={value.selected}>{value.name}</button>;
              }
              if (value.handle !== product.handle) {
                return <a className={`variant-option${value.selected ? " is-selected" : ""}`} aria-current={value.selected ? "true" : undefined} href={href} key={value.name}>{value.name}{soldOut ? <small>售罄</small> : null}</a>;
              }
              const optionProps = register("optionValue", { optionName: option.name, value: value.name });
              return (
                <a
                  className={`variant-option${value.selected ? " is-selected" : ""}${soldOut ? " variant-option--sold-out" : ""}`}
                  aria-current={value.selected ? "true" : undefined}
                  href={href}
                  key={value.name}
                  onClick={(event) => handleVariantLinkClick(event, optionProps.onClick)}
                >
                  {value.name}{soldOut ? <small>售罄</small> : null}
                </a>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function handleVariantLinkClick(event: React.MouseEvent<HTMLAnchorElement>, select: () => void): void {
  const link = event.currentTarget;
  const target = link.getAttribute("target");
  if (
    event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
    link.hasAttribute("download") || (target && target !== "_self")
  ) return;
  event.preventDefault();
  select();
}

function getProductImages(images: ImageData[]): ImageData[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}
