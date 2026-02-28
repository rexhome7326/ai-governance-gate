# Security Review Checklist — Prompt Spec

> 供 AI 掃描引擎使用的安全檢查規則集。
> 基於《Utility Safe Builder Spec (v2)》與《AI 產出資安治理報告》v1.4

---

## 一、Review 範圍

### 直接代碼（完整 Review）
- 用戶/AI 撰寫的 `.html`、`.js`、`.css` 程式碼
- 包含使用套件 API 的程式碼

### 間接依賴（行為審查，不審原始碼）
- CDN 載入的第三方庫：只檢查來源、版本、使用方式
- NPM 套件：只檢查 CVE、來源、功能分類、使用方式

### 不檢查
- 註解內容（`<!-- -->`、`//`、`/* */`）一律跳過
- 註解中的代碼語句、範例代碼、被註解掉的代碼皆不檢查
- 不需要針對性地移除註解中的代碼語句

---

## 二、檢查規則（共 15 類）

### R01 — 檔案結構與依賴

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R01-01 | 單檔 HTML：CSS/JS 必須 inline，禁止外部檔案引用 | 主要 |
| R01-02 | 禁止 `<script src="...">` 外部 JS 引用 | 主要 |
| R01-03 | 禁止 `<link rel="stylesheet" href="...">` 外部 CSS 引用 | 主要 |
| R01-04 | 禁止 `@import` 語句 | 主要 |
| R01-05 | 多檔案專案須有 `package.json` | 次要 |
| R01-06 | 不得有隱藏檔案或可疑目錄 | 主要 |

### R02 — 靜態程式碼分析 (SAST)

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R02-01 | 禁止 `eval()` 及其變形（`window.eval`、`Function.eval`） | 主要 |
| R02-02 | 禁止 `new Function()` 字串參數建構 | 主要 |
| R02-03 | 禁止字串型 `setTimeout/setInterval`（參數必須是函式） | 主要 |
| R02-04 | 檢查 `atob()`/`btoa()` 使用及大量 base64 字串 | 主要 |
| R02-05 | 禁止過度壓縮/混淆的 JS（難以審查） | 主要 |
| R02-06 | 禁止可疑字串模式（`document.write`、動態建立 `<script>`） | 主要 |

### R03 — DOM 操作安全（XSS 防護核心）

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R03-01 | 禁止 `innerHTML` 搭配變數插值或字串串接 | 主要 |
| R03-02 | 禁止 `outerHTML` 搭配變數插值或字串串接 | 主要 |
| R03-03 | 禁止 `insertAdjacentHTML` 參數包含變數 | 主要 |
| R03-04 | 禁止 `document.write` | 主要 |
| R03-05 | 禁止字串插入 SVG（須用 `<svg>` 實體標籤或 DOM API） | 主要 |
| R03-06 | SVG 不得包含 `<script>`、`<foreignObject>`、`on*` 屬性、外部引用 | 主要 |
| R03-07 | 純文字更新須用 `textContent`/`innerText`，不得用 `innerHTML` | 次要 |
| R03-08 | 清空容器須用 `replaceChildren()`，不得用 `innerHTML = ''` | 次要 |
| R03-09 | 結構渲染須用 `<template>` + `cloneNode(true)`，不得字串拼接 | 次要 |
| R03-10 | 換行處理須用 CSS `white-space: pre-wrap` 或 DOM API，禁止 `<br>` 直接寫在字串 | 次要 |

### R04 — 事件處理安全

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R04-01 | 禁止 HTML 中 `onclick="..."`、`onload="..."` 等字串型 inline event handler | 主要 |
| R04-02 | 禁止 `setAttribute('onclick', '...')`、`el.onclick = '...'`（字串指派） | 主要 |
| R04-03 | 事件綁定應優先使用 `addEventListener()` | 次要 |
| R04-04 | `el.onclick = fn` 的 `fn` 必須是函式/箭頭函式，不得為字串 | 主要 |

### R05 — 外部連線與資源

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R05-01 | 禁止 `fetch()` | 主要 |
| R05-02 | 禁止 `XMLHttpRequest` | 主要 |
| R05-03 | 禁止 `WebSocket` | 主要 |
| R05-04 | 禁止 `EventSource` | 主要 |
| R05-05 | 禁止 `navigator.sendBeacon()` | 主要 |
| R05-06 | 禁止外部 `<script>` 標籤（含動態建立） | 主要 |
| R05-07 | 禁止外部 `<link>` 標籤 | 主要 |
| R05-08 | 禁止 `<iframe>`（含動態建立） | 主要 |
| R05-09 | 禁止 `<object>`、`<embed>`、`<source>` | 主要 |
| R05-10 | 禁止 `location.href` 修改 | 主要 |
| R05-11 | 禁止 `location.assign()`/`location.replace()` | 主要 |
| R05-12 | 禁止 `<meta http-equiv="refresh">` | 主要 |
| R05-13 | 禁止 `window.open()` | 主要 |

### R06 — 資料處理與隱私

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R06-01 | 禁止 `<textarea>` | 主要 |
| R06-02 | 禁止自由文字輸入：`<input type="text\|email\|tel\|url\|password\|search\|number">` | 主要 |
| R06-03 | 禁止 `contenteditable` 屬性 | 主要 |
| R06-04 | 允許的互動元件僅限：`<button>`、`<input type="radio\|checkbox\|range">`、`<select>` | — |
| R06-05 | 禁止 `document.execCommand('copy')`（須改用替代方式） | 主要 |
| R06-06 | `navigator.clipboard.writeText` 列為建議避免（不擋審核） | 次要 |
| R06-07 | 禁止 `navigator.clipboard.readText` 及監聽 `paste` 事件 | 主要 |
| R06-08 | 禁止 `prompt()`、`confirm()`、`alert()` | 主要 |
| R06-09 | 禁止 `<form>` 標籤（應用 `<div>`/`<section>` 作為容器） | 主要 |
| R06-10 | 禁止表單提交（`form.submit()`、`form.action`、隱藏 submit 按鈕） | 主要 |
| R06-11 | 互動元件不得搭配資料送出 | 主要 |

### R07 — Cookie / Storage

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R07-01 | 禁止 `document.cookie` 讀取（S0 最高風險） | 主要 |
| R07-02 | Cookie 寫入須為非追蹤、非識別、不跨站（SameSite），不含追蹤識別碼 | 主要 |
| R07-03 | 禁止 `localStorage.getItem`、`sessionStorage.getItem`（S0 最高風險） | 主要 |
| R07-04 | Storage 寫入不得含追蹤或識別資訊（S3 最低風險允許） | 主要 |

### R08 — 環境 / 識別資訊

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R08-01 | 禁止讀取 `location.search`、`location.hash` | 主要 |
| R08-02 | 禁止讀取 `document.referrer` | 主要 |
| R08-03 | 禁止 Device Fingerprint（User-Agent、Screen Size、Timezone 等） | 主要 |

### R09 — 圖片與媒體

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R09-01 | 圖片 URL 必須使用 `https://` | 主要 |
| R09-02 | 圖片網域須為 `yimg.com`（及其子網域），非白名單網域須標記 | 主要 |
| R09-03 | 禁止 IP 位址直連及短網址（`bit.ly`、`tinyurl.com` 等） | 主要 |
| R09-04 | 禁止追蹤像素（1×1 pixel、隱藏 `<img>`） | 主要 |
| R09-05 | 圖片須有 `max-width: 100%; height: auto;` 自適應 | 次要 |

### R10 — 連結安全

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R10-01 | `<a>` 標籤必須有 `target="_blank" rel="noopener noreferrer"` | 次要 |
| R10-02 | 禁止 `window.open()` | 主要 |

### R11 — CDN 與第三方庫

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R11-01 | CDN 來源須在白名單內（見例外 E06） | 主要 |
| R11-02 | 禁止從 GitHub、個人網站等非白名單來源載入 | 主要 |
| R11-03 | 檢查 CDN 庫版本號，避免已知漏洞版本 | 主要 |
| R11-04 | 檢查使用方式是否正確 | 次要 |

### R12 — NPM 套件與依賴

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R12-01 | 掃描所有 dependencies（含間接依賴）的 CVE，標記 CVSS ≥ 7.0 | 主要 |
| R12-02 | 須使用 npm 官方 registry（`registry.npmjs.org`） | 主要 |
| R12-03 | 禁止 Git URL 或本地路徑作為套件來源 | 主要 |
| R12-04 | 禁止追蹤/分析/廣告類套件（`google-analytics`、`mixpanel`、`facebook-pixel` 等） | 主要 |
| R12-05 | 版本應使用固定版本號，避免 `^`、`~`、`latest`、`*` | 次要 |
| R12-06 | 須有 `package-lock.json` 或 `yarn.lock` | 次要 |
| R12-07 | 加密套件使用方式須正確（禁止自行實作加密） | 主要 |

### R13 — 追蹤與父層溝通

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R13-01 | `track(eventName, payload)` 須為 no-op 或 `console.log` | 主要 |
| R13-02 | 事件名稱須符合規範：`utility_view`、`utility_click`、`utility_cta_click` | 次要 |
| R13-03 | Payload 不得包含個資或可識別資訊 | 主要 |
| R13-04 | `sendHeight()` 的 `postMessage` payload 只能是 `{ type: 'resize', height: number }` | 主要 |
| R13-05 | `postMessage` 不得夾帶其他資訊（state、設定、URL 等） | 主要 |

### R14 — 視覺規範（Yahoo 設計系統）

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R14-01 | 禁止漸層（`linear-gradient`、`radial-gradient`） | 次要 |
| R14-02 | 禁止不必要的 `opacity` 使用 | 次要 |
| R14-03 | 核心色盤須定義 CSS Variables（`--color-purple: #7D2EFF` 等） | 次要 |
| R14-04 | 圓角預設 `--radius: 12px`；邊框 `1px` 或 `3px` | 次要 |

### R15 — 結構與可訪問性

| ID | 規則 | 嚴重度 |
|----|------|--------|
| R15-01 | 使用語意標籤（`<main>`、`<section>`、`<header>`、`<button>`），不用 `<div>` 做互動 | 次要 |
| R15-02 | 須有 viewport meta tag：`<meta name="viewport" content="width=device-width, initial-scale=1">` | 次要 |
| R15-03 | 互動元素須可鍵盤操作（適當 `tabindex`） | 次要 |
| R15-04 | 避免固定高度（iframe 友善） | 次要 |
| R15-05 | 避免全螢幕覆蓋；禁止 `overflow: hidden` 鎖定 body scroll | 次要 |
| R15-06 | 須有 `max-width: 100%` 自適應寬度 | 次要 |

---

## 三、例外規則（Exception Cases）

| ID | 例外描述 | 適用規則 |
|----|----------|----------|
| E01 | `innerHTML` 允許 **直接字串字面量**（如 `el.innerHTML = '<span class="icon"></span>'`），須加註解 `// SAFE_INNERHTML (static literal only)`，不得是變數或函式回傳值 | R03-01 |
| E02 | 註解中的代碼語句（`<!-- -->`、`//`、`/* */`）一律不檢查、不需移除 | 全部規則 |
| E03 | SVG 允許透過 `<svg>` 實體標籤或 DOM API 建立（非字串插入） | R03-05 |
| E04 | Cookie/Storage 寫入在 **S3 最低風險** 下允許，但須為非追蹤、非識別 | R07-02, R07-04 |
| E05 | `navigator.clipboard.writeText` 列為次要問題（建議避免），不擋審核 | R06-06 |
| E06 | CDN 白名單網域：`yimg.com`（及子網域）、`fonts.googleapis.com`、`jsdelivr.net`、`unpkg.com`、`cdnjs.cloudflare.com`、公司內 CDN | R11-01 |
| E07 | `el.onclick = fn` 允許，但 `fn` 必須是函式/箭頭函式（非字串） | R04-04 |
| E08 | 圖片白名單網域：`yimg.com`（及子網域） | R09-02 |

---

## 四、修正分級標準

### 主要問題（必須修正 — 不修正則不通過審查）

觸發條件：
- 違反核心安全規範（`eval()`、`fetch()`、`innerHTML` 搭配變數）
- 存在 XSS 攻擊向量
- 存在外部資源注入風險
- 存在資料外洩風險
- 使用禁止的網路通訊 API
- 使用 `document.execCommand('copy')`
- 使用禁止的彈窗函式（`alert`、`prompt`、`confirm`）

### 次要問題（建議修正 — 不影響審查通過）

觸發條件：
- 使用 `navigator.clipboard.writeText`（建議避免）
- 程式碼品質問題（如 `innerText` 而非 `textContent`）
- 最佳實踐建議（如移除不必要的 `async`）
- 結構性建議
- 連結缺少 `rel="noopener noreferrer"`
- 視覺規範不符
- 可訪問性不足

### 判定原則
- 不確定時，優先歸類為主要問題
- 如果問題會導致審查不通過 → 主要
- 如果問題不影響通過，但建議改進 → 次要

---

## 五、風險分級（S0 最高 → S3 最低）

```
IF 收集個資 OR 金流 OR 廣告 OR 串內部系統
    → S0（敏感資料級 — 最高風險）

ELSE IF 呼叫 API OR 登入 OR 資料上傳 OR iframe OR 非白名單 CDN OR NPM 高風險 CVE
    → S1（系統連接級 — 高風險）

ELSE IF 使用 JS OR Cookie OR LocalStorage OR 白名單 CDN OR NPM（無風險）
    → S2（前端互動級 — 中風險）

ELSE
    → S3（純靜態展示級 — 最低風險）
```

---

## 六、高風險項目速查（必須修正清單）

1. 使用 `eval()` 或 `new Function()`
2. 使用 `innerHTML` 搭配變數插值
3. 使用 `fetch`、`XMLHttpRequest` 等網路請求
4. 載入非白名單的外部資源
5. 使用 `<form>` 標籤或表單提交
6. 讀取 `document.cookie` 或 `localStorage`
7. 使用 `<iframe>`
8. 收集個資或追蹤資訊
9. NPM 套件包含高風險 CVE（無修復版本）
10. 使用非白名單 CDN 的 NPM 套件
11. 使用 `document.execCommand('copy')`

---

## 七、固定檢查順序

AI 掃描引擎應按以下順序逐項檢查：

```
 1. R01 — 檔案結構與依賴
 2. R02 — 靜態程式碼分析 (SAST)
 3. R03 — DOM 操作安全
 4. R04 — 事件處理安全
 5. R05 — 外部連線與資源
 6. R06 — 資料處理與隱私
 7. R07 — Cookie / Storage
 8. R08 — 環境 / 識別資訊
 9. R09 — 圖片與媒體
10. R10 — 連結安全
11. R11 — CDN 與第三方庫
12. R12 — NPM 套件與依賴
13. R13 — 追蹤與父層溝通
14. R14 — 視覺規範
15. R15 — 結構與可訪問性
16. 風險分級判定
```

---

## 八、輸出格式規範

### 必須包含
- 執行摘要（審查結果、風險等級、合規率、關鍵結論）
- 主要問題（必須修正）— 按類別，每條含：行號、問題、為什麼、解法
- 次要問題（建議修正）— 按類別，每條含：行號、問題、為什麼、解法
- 檢查清單（方便追蹤修正進度）
- 外部資源清單（只列有問題的）
- NPM 套件清單（只列有問題的）

### 問題格式模板

```
**第 X 行**
- **問題：** [簡潔描述]
- **為什麼：** [違規原因和風險]
- **解法：** [具體可執行的修正程式碼]
```

### 必須移除
- 所有時間相關內容（修正時間、審核時間、上線時間）
- 風險等級影響章節（修正前/修正後對照表）
- 常見問題章節（Q&A 格式）
- 聯絡資訊章節
- 通過項目章節（不列通過的項目）
- CSS 相關建議（只保留 `@import` 安全檢查）
- 通過的套件（只列有問題的）

---

> **版本：** 1.0（基於 SECURITY_REVIEW_CHECKLIST v1.4）
