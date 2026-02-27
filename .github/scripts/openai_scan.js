import fs from 'fs';

const fetch = global.fetch;
const API_KEY = process.env.OPENAI_API_KEY;
const REPORTS_DIR = 'reports';

async function scan() {
  if (!API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const geminiPath = `${REPORTS_DIR}/gemini_report.md`;
  const errorsPath = `${REPORTS_DIR}/codeql_semgrep_errors.json`;

  if (!fs.existsSync(geminiPath) || !fs.existsSync(errorsPath)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(
      `${REPORTS_DIR}/openai_report.md`,
      '# OpenAI Scan\n\n缺少 Gemini 報告或 CodeQL/Semgrep 錯誤資料。'
    );
    fs.writeFileSync(
      `${REPORTS_DIR}/openai.json`,
      JSON.stringify({ engine: 'openai', score_hint: 0, summary: '無輸入' }, null, 2)
    );
    return;
  }

  const geminiReport = fs.readFileSync(geminiPath, 'utf8');
  const errorsJson = fs.readFileSync(errorsPath, 'utf8');

  const prompt = `
你是一位應用程式安全審查員。請根據「Gemini 的掃描建議報告」以及「CodeQL & Semgrep 的原始錯誤清單」，做兩件事：
1) 判斷 Gemini 的解法是否正確、用語是否需要修正、是否有更好的解法；
2) 產出一份「最終版」的繁體中文 Markdown 報告。

## Gemini 掃描報告
${geminiReport}

## CodeQL & Semgrep 錯誤（JSON）
${errorsJson}

## 輸出要求
請「只」回傳一份 Markdown，結構如下（全部使用繁體中文）：

---
## 問題
針對每個發現的問題，請列出：
- **程式碼內容**：出問題的程式碼片段
- **位置**：檔案路徑與行號

## 解法
針對每個問題，請列出：
- **嚴重程度**：1～10（1 為不嚴重，10 為最嚴重）
- **是否必須修復**：是 / 否
- **修復方式**：具體的修復程式碼或步驟（可依你的判斷修正 Gemini 的建議或提出更好解法）

## 分數
請在報告最後給一個整體 **1～10 分** 的嚴重程度分數（1 為不嚴重，10 為最嚴重）。格式為：\`分數：N\`（N 為 1～10 的整數）。
---
`;

console.log(prompt);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
  });

  const data = await res.json();
  console.log(data);
  let rawMd = data.choices?.[0]?.message?.content?.trim() || '# OpenAI Scan\n\n無產出。';

  rawMd = rawMd
    .replace(/^```(?:markdown|md)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  const scoreMatch = rawMd.match(/分數[：:]\s*(\d+)/);
  const scoreHint = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1], 10))) : 5;

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(`${REPORTS_DIR}/openai_report.md`, rawMd);
  fs.writeFileSync(
    `${REPORTS_DIR}/openai.json`,
    JSON.stringify(
      {
        engine: 'openai',
        summary: '依 Gemini 報告與 CodeQL/Semgrep 錯誤產出的最終建議',
        severity: scoreHint >= 7 ? 'high' : scoreHint >= 4 ? 'medium' : 'low',
        score_hint: scoreHint,
        details: []
      },
      null,
      2
    )
  );
  console.log('OpenAI report and score written.');
}

scan().catch((err) => {
  console.error(err);
  process.exit(1);
});
