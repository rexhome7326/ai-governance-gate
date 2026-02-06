import fs from 'fs';

/**
 * 從 gemini.json / openai.json 讀取內容與 score_hint。
 * @param {string} file - JSON 檔案路徑（例如 'reports/gemini.json'）
 * @returns {{ result: object, score: number }} result 為 JSON 內容，score 為 score_hint（0–10，無或空則 0）
 */
export function aiScore(file) {
  const out = { result: {}, score: 0 };

  if (!fs.existsSync(file)) {
    return out;
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  out.result = data;

  const hint = data.score_hint;
  if (hint == null || hint === '') {
    return out;
  }

  const n = Number(hint);
  out.score = Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : 0;
  return out;
}
