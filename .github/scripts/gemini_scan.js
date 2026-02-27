import fs from 'fs';

const fetch = global.fetch;
const API_KEY = process.env.GEMINI_API_KEY;
const SRC_DIR = process.env.SCAN_DIR || 'src';
const REPORTS_DIR = 'reports';

function collectCode(dir) {
  let output = '';
  for (const f of fs.readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (fs.statSync(p).isDirectory()) {
      output += collectCode(p);
    } else if (f.match(/\.(js|ts|html|css|json)$/)) {
      output += `\n\n### ${p}\n` + fs.readFileSync(p, 'utf8');
    }
  }
  return output;
}

async function scan() {
  const errorsPath = `${REPORTS_DIR}/codeql_semgrep_errors.json`;
  if (!fs.existsSync(errorsPath)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(
      `${REPORTS_DIR}/gemini_report.md`,
      '# Gemini Scan\n\n無 CodeQL/Semgrep 錯誤資料。'
    );
    fs.writeFileSync(
      `${REPORTS_DIR}/gemini.json`,
      JSON.stringify({ engine: 'gemini', score_hint: 0, summary: '無輸入' }, null, 2)
    );
    return;
  }

  const errorsJson = JSON.parse(fs.readFileSync(errorsPath, 'utf8'));
  const code = collectCode(SRC_DIR);

  const prompt = `
你是一位應用程式安全審查員。請根據以下「CodeQL 與 Semgrep 的錯誤清單」以及「原始碼內容」，產出一份「中文」的掃描建議報告。

## 輸入：CodeQL & Semgrep 錯誤（JSON）
${JSON.stringify(errorsJson, null, 2)}

## 輸入：原始碼
${code}

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
- **修復方式**：具體的修復程式碼或步驟

## 分數
請在報告最後給一個整體 **1～10 分** 的嚴重程度分數（1 為不嚴重，10 為最嚴重）。格式為：\`分數：N\`（N 為 1～10 的整數）。
---
`;

console.log(prompt);

  const GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;

  let data;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    data = await res.json();

    const non2xx = res.status < 200 || res.status >= 300;
    if (non2xx && attempt < MAX_RETRIES) {
      console.warn(
        `Gemini HTTP ${res.status} (attempt ${attempt}/${MAX_RETRIES}), retry in ${RETRY_DELAY_MS / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }
    if (data?.error || non2xx) {
      throw new Error(data?.error?.message || `HTTP ${res.status}` || JSON.stringify(data?.error));
    }
    break;
  }

  console.log(data);
  let rawMd =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    '# Gemini Scan\n\n無產出。';
  console.log(rawMd);
  rawMd = rawMd
    .replace(/^```(?:markdown|md)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  const scoreMatch = rawMd.match(/分數[：:]\s*(\d+)/);
  const scoreHint = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1], 10))) : 5;

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(`${REPORTS_DIR}/gemini_report.md`, rawMd);
  fs.writeFileSync(
    `${REPORTS_DIR}/gemini.json`,
    JSON.stringify(
      {
        engine: 'gemini',
        summary: '由 CodeQL/Semgrep 錯誤與原始碼產出的中文建議',
        severity: scoreHint >= 7 ? 'high' : scoreHint >= 4 ? 'medium' : 'low',
        score_hint: scoreHint,
        details: []
      },
      null,
      2
    )
  );
  console.log('Gemini report and score written.');
}

scan().catch((err) => {
  console.error(err);
  process.exit(1);
});
