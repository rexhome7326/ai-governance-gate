import fs from 'fs';
import {
  SRC_DIR, REPORTS_DIR, checklist,
  collectCode, writeEmptyReport, writeReport, fetchWithRetry
} from './utils.js';

const API_KEY = process.env.OPENAI_API_KEY;

async function scan() {
  if (!API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const geminiPath = `${REPORTS_DIR}/gemini_report.md`;
  const errorsPath = `${REPORTS_DIR}/codeql_semgrep_errors.json`;

  if (!fs.existsSync(geminiPath) || !fs.existsSync(errorsPath)) {
    writeEmptyReport('openai', '缺少 Gemini 報告或 CodeQL/Semgrep 錯誤資料。');
    return;
  }

  const geminiReport = fs.readFileSync(geminiPath, 'utf8');
  const errorsJson = fs.readFileSync(errorsPath, 'utf8');
  const code = collectCode(SRC_DIR);

  const prompt = `
你是一位應用程式安全審查員。請根據「Gemini 的掃描建議報告」以及「CodeQL & Semgrep 的原始錯誤清單」，做兩件事：
1) 判斷 Gemini 的解法是否正確、用語是否需要修正、是否有更好的解法；
2) 產出一份「最終版」的繁體中文 Markdown 報告。

## 最高原則：
- 這是份一頁式的網頁，包含 html, inline css, inline js，不需要獨立拉出 css 跟 js 的 file。
- **LLM 安全意識 最高原則**：開發過程中須防範專屬安全威脅（如 Prompt Injection），參考 [OWASP Top 10 for LLM](https://owasp.org)。
- **修復方式條件**：修復的答案必須是一個讓你（AI 或是其他 reviewer）再次 review 一定要會過的具體修復程式碼或步驟，而不是一個抽象的答案，或是基礎的答案。

## 檢查規則
${checklist}

## Gemini 掃描報告
${geminiReport}

## 輸入：CodeQL & Semgrep 錯誤（JSON）
${errorsJson}

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
- **修復方式條件**：
  - 使用 Gemini 具體修復程式碼或步驟
  - 或是提出更好解法（你們之間沒有競爭關係，是合作關係，如果 Gemini 的解法不夠好，你可以提出更好解法，如果 Gemini 的做法已經夠了，就使用 Gemini 的做法）

## 分數
請在報告最後給一個整體 **1～10 分** 的嚴重程度分數（1 為不嚴重，10 為最嚴重）。格式為：\`分數：N\`（N 為 1～10 的整數）。
---
`;

  console.log(prompt);

  const data = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              '你是安全程式碼審查員。請根據 Gemini 報告與原始錯誤清單，判斷解法是否正確、修正語句、並產出最終繁體中文報告（含問題、解法、分數）。'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    },
    { label: 'OpenAI' }
  );

  console.log(data);
  const rawMd = data.choices?.[0]?.message?.content?.trim() || '# OpenAI Scan\n\n無產出。';

  writeReport('openai', rawMd, '依 Gemini 報告與 CodeQL/Semgrep 錯誤產出的最終建議');
}

scan().catch((err) => {
  console.error(err);
  process.exit(1);
});
