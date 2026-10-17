import type { BlogArticlePageData, BlogListingPageData } from "../types";
import { ArticleCard, SectionHeading } from "../components/site";

function dateText(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-Hant-TW", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

export function BlogListingPage({ data }: { data: BlogListingPageData }) {
  const { blog } = data;
  const pageInfo = blog.articles.pageInfo;
  const nextHref = pageInfo.endCursor ? `${data.canonicalPath}?after=${encodeURIComponent(pageInfo.endCursor)}` : undefined;
  return (
    <div className="editorial-page blog-page">
      <div className="page-masthead page-masthead--dark">
        <p className="eyebrow">FABRIC × COFFEE JOURNAL</p>
        <h1>{blog.title}</h1>
        <p>關於選布、手作與手沖咖啡的日常筆記。</p>
      </div>
      <section className="section">
        <SectionHeading title="最新文章" subtitle="由 Shopify Blog 即時提供，文章內容與發布狀態在 Shopify Admin 管理。" />
        {blog.articles.nodes.length ? (
          <div className="article-grid">
            {blog.articles.nodes.map((article) => <ArticleCard key={article.id} article={article} blogHandle={blog.handle} />)}
          </div>
        ) : (
          <div className="empty-panel"><h2>第一篇文章即將登場</h2><p>這裡會顯示已發布到 Shopify Blog 的文章。</p></div>
        )}
        {nextHref ? <a className="button button--dark pagination-link" href={nextHref}>載入更多文章 <span aria-hidden="true">→</span></a> : null}
      </section>
    </div>
  );
}

export function BlogArticlePage({ data }: { data: BlogArticlePageData }) {
  const { article, blog } = data;
  return (
    <article className="article-page">
      <nav className="breadcrumbs" aria-label="麵包屑導覽">
        <a href="/">首頁</a><span aria-hidden="true">/</span><a href={`/blogs/${blog.handle}`}>{blog.title}</a><span aria-hidden="true">/</span><span aria-current="page">{article.title}</span>
      </nav>
      <header className="article-page__header">
        <p className="eyebrow">FABRIC &amp; COFFEE JOURNAL</p>
        <h1>{article.title}</h1>
        <p className="article-page__deck">{article.excerpt}</p>
        <div className="article-page__byline"><time dateTime={article.publishedAt}>{dateText(article.publishedAt)}</time>{article.authorV2?.name ? <span>撰文・{article.authorV2.name}</span> : null}</div>
      </header>
      {article.image ? <figure className="article-page__hero"><img src={article.image.url} alt={article.image.altText ?? article.title} fetchPriority="high" /><figcaption>{article.image.altText ?? article.title}</figcaption></figure> : null}
      <div className="article-page__body rte" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
      <footer className="article-page__footer">
        <a className="button button--outline-dark" href={`/blogs/${blog.handle}`}>返回布藝咖啡誌 <span aria-hidden="true">→</span></a>
      </footer>
    </article>
  );
}
