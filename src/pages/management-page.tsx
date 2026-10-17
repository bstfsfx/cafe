import type { ManagementPageData } from "../types";
import { SectionHeading } from "../components/site";

const adminAreas: Array<{
  area: keyof ManagementPageData["adminLinks"];
  title: string;
  text: string;
  action: string;
}> = [
  { area: "products", title: "商品與庫存", text: "新增商品、調整商品內容與庫存。", action: "前往商品管理" },
  { area: "collections", title: "分類與商品集合", text: "維護成衣材料、精品咖啡與其他 collections。", action: "管理商品集合" },
  { area: "blogs", title: "部落格與文章", text: "編輯 Shopify Blog、發布或更新文章。", action: "管理 Shopify Blog" },
  { area: "orders", title: "訂單與店舖設定", text: "在 Shopify 管理中心處理訂單和營運設定。", action: "管理訂單" },
];

export function ManagementPage({ data }: { data: ManagementPageData }) {
  return (
    <div className="management-page">
      <header className="page-masthead page-masthead--dark">
        <p className="eyebrow">SHOP OWNER WORKSPACE</p>
        <h1>店主管理主控台</h1>
        <p>{data.shopName} · 內容與訂單由 Shopify Admin 安全管理</p>
      </header>
      <section className="section management-summary" aria-label="店面公開摘要">
        <SectionHeading title="店面概況" subtitle="以下為 Storefront 公開內容摘要；不顯示訂單、顧客或管理憑證。" />
        <div className="stat-row">
          <div className="stat-card"><span>公開商品</span><strong>{data.productCount}</strong></div>
          <div className="stat-card"><span>商品集合</span><strong>{data.collectionCount}</strong></div>
          <div className="stat-card"><span>已發布文章</span><strong>{data.articleCount}</strong></div>
        </div>
      </section>
      <section className="section admin-access-section">
        <SectionHeading title="管理工作區" subtitle="點選後進入 Shopify 管理中心；若尚未登入，Shopify 會要求店主完成驗證。" />
        <div className="admin-access-grid">
          {adminAreas.map((area, index) => (
            <article className="admin-access-card" key={area.title}>
              <span className="admin-access-card__index">0{index + 1}</span>
              <h2>{area.title}</h2>
              <p>{area.text}</p>
              <a className="button button--dark" href={data.adminLinks[area.area]} target="_blank" rel="noopener noreferrer">{area.action} <span aria-hidden="true">↗</span></a>
            </article>
          ))}
        </div>
        <p className="management-security-note">本頁不接受 Admin API 寫入、不儲存管理 token，實際修改由 Shopify Admin 的登入與權限機制保護。</p>
      </section>
    </div>
  );
}
