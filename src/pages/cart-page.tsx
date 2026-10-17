import { useCart, useCartForm } from "../cart";
import { formatPrice } from "../money";

type CartLineShape = {
  id: string;
  quantity: number;
  attributes?: Array<{ key: string; value: string | null }>;
  cost?: { totalAmount?: { amount: string; currencyCode: string } | null } | null;
  merchandise?: {
    title?: string | null;
    selectedOptions?: Array<{ name: string; value: string }>;
    availableForSale?: boolean;
    image?: { url: string; altText?: string | null; width?: number | null; height?: number | null } | null;
    product?: { handle?: string | null; title?: string | null } | null;
  } | null;
};

export function CartPage() {
  const loading = useCart((state) => state.loading);
  const lines = useCart((state) => state.data.lines.nodes) as CartLineShape[];
  const cart = useCart((state) => state.data);
  const pendingLines = useCart((state) => state.pending.lines);
  const totalsPending = useCart((state) => state.pending.cost || state.revalidating);
  const networkErrors = useCart((state) => state.errors.network);
  const lineErrors = useCart((state) => state.errors.lines);
  const cost = cart.cost;

  return (
    <div className="editorial-page cart-page">
      <header className="page-masthead page-masthead--dark">
        <p className="eyebrow">YOUR SHOPPING BAG</p>
        <h1>購物袋</h1>
        <p>挑選喜歡的材料與風味，結帳由 Shopify 安全處理。</p>
      </header>
      <section className="section cart-section">
        {networkErrors.length ? <div className="cart-error-banner" role="alert">{networkErrors.map((error, index) => <p key={`${index}-${error.message}`}>{error.message}</p>)}</div> : null}
        {loading ? (
          <div className="cart-loading" role="status"><span className="loading-rule" /><p>正在載入購物袋…</p></div>
        ) : lines.length ? (
          <div className="cart-layout">
            <div className="cart-lines">
              {lines.map((line) => (
                <CartLine key={line.id} line={line} pending={pendingLines.has(line.id)} errors={lineErrors.get(line.id)} />
              ))}
            </div>
            <aside className="cart-summary">
              <p className="eyebrow">ORDER SUMMARY</p>
              <h2>訂單摘要</h2>
              <div className={`cart-total-row${totalsPending ? " is-pending" : ""}`}><span>小計</span><strong>{cost?.subtotalAmount ? formatPrice(cost.subtotalAmount, "zh-TW") : "—"}</strong></div>
              <div className={`cart-total-row cart-total-row--grand${totalsPending ? " is-pending" : ""}`}><span>訂單總計</span><strong>{cost?.totalAmount ? formatPrice(cost.totalAmount, "zh-TW") : "—"}</strong></div>
              <p className="cart-summary__note">運費、稅項及折扣將於 Shopify Checkout 按訂單地址計算。</p>
              {cart.checkoutUrl ? <a className="button button--dark button--wide" href={cart.checkoutUrl}>前往安全結帳 <span aria-hidden="true">→</span></a> : <span className="button button--disabled button--wide" aria-disabled="true">暫無可用結帳連結</span>}
              <a className="cart-continue" href="/collections">繼續購物</a>
            </aside>
          </div>
        ) : (
          <div className="cart-empty">
            <span className="cart-empty__mark" aria-hidden="true">F/C</span>
            <h2>購物袋還是空的</h2>
            <p>從喜歡的布料、咖啡與手作選品開始。</p>
            <a className="button button--dark" href="/collections">探索商品目錄 <span aria-hidden="true">→</span></a>
          </div>
        )}
      </section>
    </div>
  );
}

function CartLine({ line, pending, errors }: { line: CartLineShape; pending: boolean; errors?: { userErrors?: Array<{ message: string }>; warnings?: Array<{ message: string }> } }) {
  const { formProps, register } = useCartForm();
  const merchandise = line.merchandise;
  const title = merchandise?.product?.title ?? merchandise?.title ?? "商品";
  const handle = merchandise?.product?.handle;
  const messages = [...(errors?.userErrors ?? []), ...(errors?.warnings ?? [])];
  return (
    <article className={`cart-line${pending ? " cart-line--pending" : ""}`}>
      <a className="cart-line__image" href={handle ? `/products/${handle}` : "/collections"}>
        {merchandise?.image ? <img src={merchandise.image.url} alt={merchandise.image.altText ?? title} width={merchandise.image.width ?? undefined} height={merchandise.image.height ?? undefined} /> : <span className="image-fallback">布藝咖啡</span>}
      </a>
      <div className="cart-line__details">
        <h2>{handle ? <a href={`/products/${handle}`}>{title}</a> : title}</h2>
        <div className="cart-line__options">{merchandise?.selectedOptions?.map((option) => <span key={`${option.name}-${option.value}`}>{option.name}：{option.value}</span>)}</div>
        {merchandise?.availableForSale === false ? <p className="stock-note stock-note--out">暫時售罄</p> : null}
        {line.attributes?.filter((attribute) => !attribute.key.startsWith("_")).map((attribute) => <p className="cart-line__attribute" key={attribute.key}>{attribute.key}：{attribute.value}</p>)}
        <form className="cart-quantity-form" {...formProps()}>
          <button {...register("set")} hidden aria-label="更新數量" />
          <input type="hidden" {...register("lineId", { value: line.id })} />
          <button className="quantity-control" {...register("decrease")} aria-label={`減少 ${title} 數量`}>−</button>
          <label className="sr-only" htmlFor={`quantity-${safeId(line.id)}`}>數量</label>
          <input id={`quantity-${safeId(line.id)}`} className="quantity-input" min="1" step="1" aria-invalid={messages.length ? "true" : undefined} aria-describedby={messages.length ? `line-errors-${safeId(line.id)}` : undefined} {...register("quantity", { value: line.quantity, interactive: true })} />
          <button className="quantity-control" {...register("increase")} aria-label={`增加 ${title} 數量`}>＋</button>
          <button className="cart-remove" {...register("remove")}>移除</button>
        </form>
        {messages.length ? <ul className="cart-line__errors" id={`line-errors-${safeId(line.id)}`} role="alert">{messages.map((message, index) => <li key={`${index}-${message.message}`}>{message.message}</li>)}</ul> : null}
      </div>
      <p className={`cart-line__price${pending ? " is-pending" : ""}`}>{line.cost?.totalAmount ? formatPrice(line.cost.totalAmount, "zh-TW") : "—"}</p>
    </article>
  );
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}
