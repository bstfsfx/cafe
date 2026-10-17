# 布藝咖啡 Shopify 店面計畫

## 範圍與設計方向

依使用者提供的長版參考圖建置繁體中文、響應式的 Shopify SSR 店面，含商品目錄、商品詳情、Shopify server-side cart、Shopify Checkout、原生 Shopify Blog 文章列表／詳情，以及店主管理主控台入口。依使用者最新決定使用 Shopify Blog，不建立自有 CMS，也不啟用 Managed MySQL。

- **設計運動：** 香港工藝咖啡館的編輯式商業設計，讓布料樣本、木作桌面與沖煮器具成為畫面主角。
- **核心原則：** 以照片和材料質感敘事；左右不對稱的編輯分區；細邊框與節制留白；購物 CTA 清楚但不喧賓奪主。
- **色彩哲學：** 暖米白作為布樣底色，炭黑承接咖啡器具與故事區，深茶褐作為品牌識別，少量縫線金作為提示色；以低彩度維持耐看、手作感。
- **版面範式：** 上方緊湊導覽與沉浸式橫幅；分類以兩個並列大卡呈現；品牌故事使用深色文字欄和情境影像欄；體驗以四欄照片卡；店鋪資訊與最新文章左右並列；手機版改為可讀的順序堆疊，保留照片與標題層級。
- **識別元素：** 布料織紋／縫線式細框、咖啡豆與線軸共同構成的圓形印記、深淺照片區塊交替。
- **互動哲學：** 使用原生連結與可見表單；Hydrogen 表單提供無 JavaScript fallback；購物袋有完整 `/cart` 頁、數量更新與移除功能；篩選和排序以 URL 作為資料來源。
- **動畫：** 只使用短促淡入、柔和位移與 hover 過渡；避免視差、循環動效或阻礙操作的延遲；尊重 `prefers-reduced-motion`。
- **字體系統：** 繁體中文字使用系統宋體／明體作標題、系統黑體作介面與內文；英文字標使用高對比襯線字，導覽與價格使用清晰無襯線字；避免依賴不可用的外部字體才能正確顯示。
- **品牌定位：** 為香港的手作愛好者與咖啡日常設計，將布料工藝與精品咖啡放在同一張工作桌上；個性：溫厚、靜謐、好奇。
- **品牌語氣：** 簡潔、具體、帶手感。示例：「把日常縫得更從容。」「一杯手沖，替布料留一點時間。」
- **字標概念：** 「布藝咖啡」以帶手工刻痕的高對比中文字呈現，旁置小型「Fabric & Coffee」；識別符號以咖啡豆縱線與織布經緯交會，避免使用單一預設字型假裝成定製字標。
- **專屬品牌色：** 深茶褐 `#6B4C38`。

## Shopify 與應用實作

以 Node SSR、React、Vite、Express 與 Hydrogen 2026.10.0 為主；Hydrogen Storefront API client 在 server request boundary 建立並讀取 Shopify 商品、collections、blogs 與 articles。Managed MySQL 保持未啟用；文章資料在 Shopify Blog，由 Shopify Admin 管理。商品資料與分類不在前端硬編；在新開發店建立兩個含 Shopify media 的示範商品。價格和幣別從 Shopify 回傳資料讀取；目前開發店的基礎幣別為 TWD，未修改商店財務設定。商品詳情使用 `/products/:handle`，collections、search、cart 使用 Shopify 標準路徑；部落格使用 `/blogs/:blogHandle` 與 `/blogs/:blogHandle/:articleHandle`。

Shopify runtime scripts 的 `shopId` 由 Storefront API `shop { id }` 查詢取得，並按商店網域快取；只有設定獨立 Hydrogen storefront ID 時才使用該值，否則依 Hydrogen 文件以 `"0"` 作為 `storefrontId` fallback。`myshopifyDomain` 取自 Shopify 整合的商店網域；必要識別值在 server side 解析後序列化到 SSR 文件。

商品描述與 Shopify Blog 文章 HTML 在 SSR 前經白名單清理。Canonical 與 `og:url` 只在 `PUBLIC_SITE_URL` 為有效 HTTPS origin 時輸出，不猜測正式網域；`public/robots.txt` 明確允許爬蟲，購物袋、搜尋與管理頁仍使用 noindex metadata。

購物袋 UI 使用 Hydrogen React CartProvider、CartForm 和 Standard Actions，並由 Shopify 官方 Storefront Cart API 在 server side 執行 `cartCreate`、`cartLinesAdd`、`cartLinesUpdate`、`cartLinesRemove`。Hydrogen 2026.10 預設 cart handler 會查詢 selling-plan 欄位，但目前 Shopify 整合 token 未授予該非必要 scope；因此 `/api/cart` 使用自訂 query/handler，只讀取購物袋 UI 所需欄位，不增加 managed token 權限。SSR `/cart` 使用 Shopify 回傳的 cart totals，結帳只連至 Shopify 回傳的 `checkoutUrl`。公開 HTTPS Preview 的 cart cookie 設為 `HttpOnly; Secure; SameSite=None; Path=/; Partitioned`；純 HTTP localhost 保持本機安全屬性。

首頁「最新消息」讀取 Shopify Blog 最新文章，並提供原生部落格列表與文章詳情頁，顯示 Shopify 文章標題、摘要、日期、內文和可用封面圖。未提供的商業地址或營業時間不捏造具體資料。

新增 `/management` 管理主控台，呈現店面目錄／文章的公開摘要，並以 Shopify store domain 產生 `/admin/products`、`/admin/collections`、`/admin/content/blogs` 與 `/admin/orders` 外部入口。實際編輯與訂單操作交由已登入的 Shopify Admin；不把管理 token 帶進前端、不用 Storefront API 假造寫入能力、不建立無認證的 Admin API proxy。

## 專案結構

- `server.ts`：Express／Vite SSR listener、HTTP 與 Fetch `Request` 橋接。
- `src/server/handle-request.ts`：Hydrogen request handlers、Storefront client、頁面資料載入、Shopify redirects、SSR response headers 與 Preview cart cookie。
- `src/server/cart.server.ts`：Shopify Storefront Cart API 查詢／mutation、Hydrogen cart form parser、cart cookie 與 `/api/cart` server route。
- `src/server/route-templates.ts`：共享的 Shopify 標準路由模板。
- `src/server/queries.ts`、`src/server/page-data.ts`：Storefront GraphQL 文件與 server-only 路由資料。
- `src/App.tsx`、`src/components/`、`src/pages/`：SSR／互動 UI、導覽、商品卡、collection/search、文章、管理頁和 cart page。
- `src/cart.ts`、`src/client.tsx`、`src/styles.css`：Hydrogen React cart bindings、hydration 與全域響應式樣式。
- `public/manus-routes.json`：靜態頁面路由宣告。

## 路由與內容

路由包括 `/`、`/collections`、`/collections/:handle`、`/products/:handle`、`/search`、`/cart`、`/blogs/:blogHandle`、`/blogs/:blogHandle/:articleHandle` 與 `/management`。應用程式 SSR 輸出繁體中文有內容的 HTML、每頁 metadata、正確 404 狀態及無障礙操作。沒有已設定的正式網域前省略 canonical 與 `og:url`，避免猜測公開 URL。
