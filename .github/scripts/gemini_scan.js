import fs from 'fs';
import {
  SRC_DIR, REPORTS_DIR, checklist,
  collectCode, writeEmptyReport, writeReport, fetchWithRetry
} from './utils.js';

const API_KEY = process.env.GEMINI_API_KEY;

async function scan() {
  const errorsPath = `${REPORTS_DIR}/codeql_semgrep_errors.json`;
  if (!fs.existsSync(errorsPath)) {
    writeEmptyReport('gemini', '無 CodeQL/Semgrep 錯誤資料。');
    return;
  }

  const errorsJson = JSON.parse(fs.readFileSync(errorsPath, 'utf8'));
  const code = collectCode(SRC_DIR);

  const prompt = `
你是一位應用程式安全審查員。請根據以下「CodeQL 與 Semgrep 的錯誤清單」以及「原始碼內容」，產出一份「中文」的掃描建議報告。

## 最高原則：
- 這是份一頁式的網頁，包含 html, inline css, inline js，不需要獨立拉出 css 跟 js 的 file。
- **LLM 安全意識 最高原則**：開發過程中須防範專屬安全威脅（如 Prompt Injection），參考 [OWASP Top 10 for LLM](https://owasp.org)。
- **修復方式條件**：修復的答案必須是一個讓你（AI 或是其他 reviewer）再次 review 一定要會過的具體修復程式碼或步驟，而不是一個抽象的答案，或是基礎的答案。

## 檢查規則
${checklist}

## 輸入：CodeQL & Semgrep 錯誤（JSON）
${JSON.stringify(errorsJson, null, 2)}

## 輸入：原始碼
${code}

## 輸出要求
請「只」回傳一份 Markdown，結構如下（全部使用繁體中文）：

---
## 問題 & 解法
針對每個發現的問題，請列出：
- **程式碼內容**：出問題的程式碼片段
- **位置**：檔案路徑與行號
- **嚴重程度**：1～10（1 為不嚴重，10 為最嚴重）
- **是否必須修復**：是 / 否
- **修復方式條件**：具體修復程式碼或步驟

## 分數
請在報告最後給一個整體 **1～10 分** 的嚴重程度分數（1 為不嚴重，10 為最嚴重）。格式為：\`分數：N\`（N 為 1～10 的整數）。
---
`;

  console.log(prompt);

  const GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

  const data = await fetchWithRetry(
    GEMINI_URL,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    },
    { label: 'Gemini' }
  );

  console.log(data);
  const rawMd =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    '# Gemini Scan\n\n無產出。';
  console.log(rawMd);

  writeReport('gemini', rawMd, '由 CodeQL/Semgrep 錯誤與原始碼產出的中文建議');
}

scan().catch((err) => {
  console.error(err);
  process.exit(1);
});
