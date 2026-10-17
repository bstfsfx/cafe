import type { ArticleSummary, CollectionSummary, ProductCardData } from "../types";
import { formatPrice } from "../money";
import { useCart } from "../cart";

export function findCollection(collections: CollectionSummary[], type: "fabric" | "coffee"): CollectionSummary | undefined {
  const pattern = type === "fabric" ? /布|成衣|紡織|fabric|textile/i : /咖啡|coffee/i;
  return collections.find((collection) => pattern.test(collection.title) || pattern.test(collection.handle));
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark${compact ? " brand-mark--compact" : ""}`}>
      <svg className="brand-mark__symbol" viewBox="0 0 44 44" role="img" aria-label="咖啡豆與織紋標誌">
        <path d="M22 4c9 0 16 7 16 16S31 39 22 39 6 32 6 23 13 4 22 4Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M28.6 9.3C18.7 14.8 13.2 22 15.1 30.4c.4 1.8 1.1 3.3 2.1 4.5M14.7 16h15.1M10.9 22h21.7M11.8 28h17.9" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
      <span className="brand-mark__type">
        <strong>布藝咖啡</strong>
        <small>Fabric &amp; Coffee</small>
      </span>
    </span>
  );
}

export function SiteHeader({ collections = [] }: { collections?: CollectionSummary[] }) {
  const cartQuantity = useCart((state) => state.data.totalQuantity);
  const fabric = findCollection(collections, "fabric");
  const coffee = findCollection(collections, "coffee");
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="布藝咖啡 Fabric & Coffee 首頁"><BrandMark /></a>
      <nav className="site-nav" aria-label="主要導覽">
        <a href="/" className="site-nav__home">首頁</a>
        <a href={fabric ? `/collections/${fabric.handle}` : "/collections"}>成衣材料</a>
        <a href={coffee ? `/collections/${coffee.handle}` : "/collections"}>精品咖啡</a>
        <a href="/blogs/news">布藝咖啡誌</a>
        <a href="/#story">品牌故事</a>
        <a href="/#workshop">課程工作坊</a>
        <a href="/#visit">店鋪資訊</a>
      </nav>
      <div className="header-actions">
        <form className="header-search" action="/search" method="get" role="search">
          <label className="sr-only" htmlFor="header-search-input">搜尋商品</label>
          <input id="header-search-input" name="q" type="search" placeholder="搜尋布料與咖啡" />
          <button aria-label="搜尋" type="submit">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.7" /><path d="m16 16 4.2 4.2" /></svg>
          </button>
        </form>
        <a className="bag-link" href="/cart" aria-label={`購物袋 ${cartQuantity} 件商品`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
          <span className="bag-link__count" data-cart-count="true">{cartQuantity}</span>
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <>
      <section className="footer-cta" aria-labelledby="footer-cta-title">
        <div className="footer-cta__content">
          <p className="eyebrow">FABRIC × COFFEE × SHAM SHUI PO</p>
          <h2 id="footer-cta-title">今天想找材料，還是想試一杯好咖啡？</h2>
          <p>把喜歡的質地與風味，帶回自己的日常。</p>
          <div className="button-row">
            <a className="button button--outline-light" href="/collections">探索商品目錄 <span aria-hidden="true">→</span></a>
            <a className="button button--outline-light" href="/blogs/news">閱讀布藝咖啡誌 <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
      <footer className="site-footer">
        <a className="footer-brand" href="/"><BrandMark compact /></a>
        <nav aria-label="頁尾導覽">
          <a href="/collections">商品目錄</a>
          <a href="/blogs/news">布藝咖啡誌</a>
          <a href="/#visit">店鋪資訊</a>
          <a href="/cart">購物袋</a>
          <a className="owner-link" href="/management">店主管理主控台</a>
        </nav>
        <p className="footer-copyright">© 2026 布藝咖啡 Fabric &amp; Coffee. All rights reserved.</p>
        <p className="footer-signoff">Fabric × Coffee × Sham Shui Po</p>
      </footer>
    </>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, moreHref, moreLabel }: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p className="section-heading__subtitle">{subtitle}</p> : null}
      </div>
      {moreHref ? <a className="text-link" href={moreHref}>{moreLabel ?? "查看全部"} <span aria-hidden="true">→</span></a> : null}
    </div>
  );
}

export function ProductCard({ product, currencyCode }: { product: ProductCardData; currencyCode: string }) {
  const image = product.featuredImage;
  return (
    <article className="product-card">
      <a className="product-card__image" href={`/products/${product.handle}`} aria-label={`查看 ${product.title}`}>
        {image ? <img src={image.url} alt={image.altText ?? product.title} loading="lazy" width={image.width ?? undefined} height={image.height ?? undefined} /> : <span className="image-fallback">布藝咖啡</span>}
        <span className="product-card__quick">查看商品 <span aria-hidden="true">↗</span></span>
      </a>
      <div className="product-card__meta">
        <h3><a href={`/products/${product.handle}`}>{product.title}</a></h3>
        {product.vendor ? <p className="product-card__vendor">{product.vendor}</p> : null}
        <p className="product-card__price">{formatPrice(product.priceRange.minVariantPrice, "zh-TW")}</p>
      </div>
    </article>
  );
}

export function ArticleCard({ article, blogHandle = "news", layout = "vertical" }: {
  article: ArticleSummary;
  blogHandle?: string;
  layout?: "vertical" | "horizontal";
}) {
  const image = article.image;
  const date = new Date(article.publishedAt);
  const dateLabel = Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-Hant-TW", { dateStyle: "medium", timeZone: "UTC" }).format(date);
  return (
    <article className={`article-card article-card--${layout}`}>
      <a className="article-card__image" href={`/blogs/${blogHandle}/${article.handle}`} aria-label={`閱讀文章：${article.title}`}>
        {image ? <img src={image.url} alt={image.altText ?? article.title} loading="lazy" width={image.width ?? undefined} height={image.height ?? undefined} /> : <span className="image-fallback">布藝咖啡誌</span>}
      </a>
      <div className="article-card__content">
        <time dateTime={article.publishedAt}>{dateLabel}</time>
        <h3><a href={`/blogs/${blogHandle}/${article.handle}`}>{article.title}</a></h3>
        <p>{article.excerpt}</p>
        <a className="text-link" href={`/blogs/${blogHandle}/${article.handle}`}>閱讀文章 <span aria-hidden="true">→</span></a>
      </div>
    </article>
  );
}

export function CategoryGlyph({ label, index }: { label: string; index: number }) {
  const paths = [
    <><path d="M6 4h12l3 4v12H5V8l1-4Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
    <><path d="m8 4 8 16M16 4 8 20M5 8h14M5 16h14" /></>,
    <><circle cx="12" cy="12" r="8" /><circle cx="9" cy="10" r=".7" /><circle cx="15" cy="10" r=".7" /><path d="M8.5 14c1.8 2 5.2 2 7 0" /></>,
    <><ellipse cx="12" cy="7" rx="6" ry="2.7" /><path d="M6 7v8c0 1.5 2.7 2.8 6 2.8s6-1.3 6-2.8V7M8 11c2.2 1.5 5.8 1.5 8 0" /></>,
    <><path d="m8 4 8 16M16 4 8 20M5 8h14M5 16h14" /><circle cx="12" cy="12" r="2" /></>,
    <><path d="M5 14c0-5 3.2-8 7-8s7 3 7 8c0 3-3 5-7 5s-7-2-7-5Z" /><path d="M12 6c-2 3-2 7 0 12" /></>,
    <><path d="M7 8h8a3 3 0 0 1 0 6H7V8Z" /><path d="M15 10h2a2 2 0 0 1 0 4h-2M7 18h11M9 5c-1-1 1-1 0-2M13 5c-1-1 1-1 0-2" /></>,
    <><path d="M7 8h10l-1 12H8L7 8ZM9 8V5a3 3 0 0 1 6 0v3M5 8h14" /><path d="M12 12v5" /></>,
    <><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" /><circle cx="12" cy="12" r="2.2" /></>,
  ];
  const path = paths[index % paths.length];
  return (
    <span className="category-glyph" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
      <span>{label}</span>
    </span>
  );
}
