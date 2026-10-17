import type { HomePageData } from "../types";
import { ArticleCard, CategoryGlyph, findCollection, ProductCard, SectionHeading } from "../components/site";

const fabricGroups = ["布料", "拉鏈", "鈕扣", "織帶", "其他輔料"];
const coffeeGroups = ["咖啡豆", "飲品", "器具", "禮品"];

const experiences = [
  { title: "咖啡工作坊", text: "從磨豆、注水到風味辨識，練習一杯自己的手沖。", image: "/assets/pour-over.jpg", alt: "玻璃濾杯與手沖咖啡器具" },
  { title: "材料選擇指導", text: "認識不同布料的手感、厚薄與日常使用方式。", image: "/assets/textile-studio.png", alt: "工作桌上的布料樣本與縫紉工具" },
  { title: "手作體驗", text: "以布料與簡單工具，慢慢完成一件日常小物。", image: "/assets/cafe-detail.jpg", alt: "布料與咖啡並置的手作工作桌" },
  { title: "社群交流", text: "和喜歡手作、材料與咖啡的人，分享靈感和新發現。", image: "/assets/cafe-interior.jpg", alt: "溫暖的咖啡工作室空間" },
];

export function HomePage({ data }: { data: HomePageData }) {
  const fabric = findCollection(data.collections, "fabric");
  const coffee = findCollection(data.collections, "coffee");
  const fabricHref = fabric ? `/collections/${fabric.handle}` : "/collections";
  const coffeeHref = coffee ? `/collections/${coffee.handle}` : "/collections";
  const articles = data.blog?.articles.nodes ?? [];
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__panel hero__panel--fabric"><img src="/assets/textile-studio.png" alt="摺疊布料樣本和裁縫工具" fetchPriority="high" /></div>
        <div className="hero__panel hero__panel--coffee"><img src="/assets/pour-over.jpg" alt="手沖咖啡與烘焙咖啡豆" fetchPriority="high" /></div>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="hero__brand">布藝咖啡 <span>Fabric &amp; Coffee</span></p>
          <h1 id="hero-title">工藝與風味，<br />在深水埗相遇。</h1>
          <p>從成衣材料到精品咖啡，<br />探索材料、手感與生活的更多可能。</p>
          <div className="button-row">
            <a className="button button--light" href={fabricHref}>探索成衣材料 <span aria-hidden="true">→</span></a>
            <a className="button button--outline-light" href={coffeeHref}>探索精品咖啡 <span aria-hidden="true">→</span></a>
          </div>
          <span className="hero__location">Sham Shui Po<br />Hong Kong</span>
        </div>
      </section>

      <section className="section category-section" aria-labelledby="category-title">
        <div className="section-heading section-heading--flush">
          <div><h2 id="category-title">按類別選購 <span className="section-heading__en">Shop by Category</span></h2></div>
          <a className="text-link" href="/collections">所有分類 <span aria-hidden="true">→</span></a>
        </div>
        <div className="category-grid">
          <CategoryCard title="成衣材料" english="Fabric & Notions" description="布料・拉鏈・鈕扣・織帶・其他輔料" image="/assets/textile-studio.png" alt="布料工作室內陳列的成衣材料與手作選品" href={fabricHref} groups={fabricGroups} offset={0} />
          <CategoryCard title="精品咖啡" english="Specialty Coffee" description="咖啡豆・飲品・器具・禮品" image="/assets/pour-over.jpg" alt="手沖咖啡、咖啡豆與器具" href={coffeeHref} groups={coffeeGroups} offset={5} />
        </div>
      </section>

      <section className="story" id="story" aria-labelledby="story-title">
        <div className="story__copy">
          <p className="eyebrow">OUR STORY</p>
          <h2 id="story-title">一間店，兩種專業</h2>
          <p>我們喜歡深水埗的成衣與零售街景，也相信一杯好咖啡能讓人慢下來。</p>
          <p>從布料、輔料到一件作品，從咖啡豆到手沖的香氣，讓不同的手藝在同一張工作桌上相遇。</p>
          <p>在這裡，布料與咖啡不是商品而已，<br />而是連結工藝、風味與生活的媒介。</p>
          <a className="button button--outline-light" href="/blogs/news">認識布藝咖啡 <span aria-hidden="true">→</span></a>
        </div>
        <div className="story__image"><img src="/assets/coffee-on-linen.jpg" alt="布料樣本、咖啡豆與手沖咖啡交織的工作桌" loading="lazy" /></div>
      </section>

      <section className="section experience-section" id="workshop" aria-labelledby="experience-title">
        <SectionHeading eyebrow="EXPERIENCE & WORKSHOP" title="體驗・學習・交流" subtitle="不只購物，也可以學習與交流。" />
        <div className="experience-grid">
          {experiences.map((item, index) => (
            <article className="experience-card" key={item.title}>
              <a href="/blogs/news" className="experience-card__image" aria-label={`閱讀 ${item.title} 相關資訊`}>
                <img src={item.image} alt={item.alt} loading="lazy" />
              </a>
              <div className="experience-card__body">
                <span className="experience-card__number">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <a className="button button--dark" href="/blogs/news">了解活動資訊 <span aria-hidden="true">→</span></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="visit-section" id="visit" aria-labelledby="visit-title">
        <div className="visit-section__image">
          <img src="/assets/cafe-interior.jpg" alt="布藝咖啡工作室與選品空間" loading="lazy" />
          <div className="visit-section__image-caption"><p>來深水埗</p><p>親身感受材料與咖啡</p><span>Fabric, Coffee &amp; Everyday Craft</span></div>
        </div>
        <div className="visit-section__content">
          <div className="visit-details">
            <p className="eyebrow">VISIT US</p>
            <h2 id="visit-title">店鋪資訊</h2>
            <dl>
              <div><dt>地點</dt><dd>香港・深水埗<br /><small>詳細地址請以店舖公告為準</small></dd></div>
              <div><dt>交通方式</dt><dd>到店資訊將於正式營業公告中更新</dd></div>
              <div><dt>營業時間</dt><dd>請留意最新消息</dd></div>
              <div><dt>聯絡方式</dt><dd>聯絡資訊待店主設定</dd></div>
            </dl>
          </div>
          <div className="latest-news">
            <SectionHeading title="最新消息" moreHref={`/blogs/${data.blog?.handle ?? "news"}`} moreLabel="全部文章" />
            {articles.length ? (
              <div className="latest-news__list">
                {articles.slice(0, 3).map((article) => <ArticleCard key={article.id} article={article} blogHandle={data.blog?.handle ?? "news"} layout="horizontal" />)}
              </div>
            ) : (
              <p className="empty-note">文章正在整理中，先看看布藝與咖啡的選品。</p>
            )}
          </div>
        </div>
      </section>

      {data.products.length ? (
        <section className="section featured-section" aria-labelledby="featured-title">
          <SectionHeading eyebrow="SHOP THE COLLECTION" title="選品一覽" subtitle="每一件商品都來自 Shopify 商品目錄。" moreHref="/collections" moreLabel="瀏覽全部商品" />
          <div className="product-grid product-grid--featured">
            {data.products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} currencyCode={data.currencyCode} />)}
          </div>
        </section>
      ) : null}
    </>
  );
}

function CategoryCard({ title, english, description, image, alt, href, groups, offset }: {
  title: string;
  english: string;
  description: string;
  image: string;
  alt: string;
  href: string;
  groups: string[];
  offset: number;
}) {
  return (
    <article className="category-card">
      <a href={href} className="category-card__main">
        <div className="category-card__image"><img src={image} alt={alt} loading="lazy" /></div>
        <div className="category-card__copy">
          <p className="eyebrow">{english}</p>
          <h3>{title}</h3>
          <p>{description}</p>
          <span className="button button--quiet">進入{title}商品目錄 <span aria-hidden="true">→</span></span>
        </div>
      </a>
      <div className="category-card__subcategories">
        {groups.map((group, index) => <a href={href} key={group}><CategoryGlyph label={group} index={offset + index} /></a>)}
      </div>
    </article>
  );
}
