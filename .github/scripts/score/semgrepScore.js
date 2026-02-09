import fs from 'fs';

/** 依 result.extra.severity 對應成 1–10 分數（Semgrep 常用 ERROR / WARNING / INFO） */
function severityToScore(severity) {
  if (severity == null) return 1;
  const s = String(severity).toUpperCase();
  if (s === 'ERROR') return 7.5;
  if (s === 'WARNING') return 5;
  if (s === 'INFO' || s === 'INFO ') return 2.5;
  return 1;
}

/**
 * 讀取 Semgrep JSON，為每個 result 掛上 severityScore，並依加總平均算出分數。
 * @param {string} file - Semgrep 輸出檔路徑（例如 'reports/semgrep.json'）
 * @returns {{ results: Array, score: number }} results 為帶有 severityScore 的 result 陣列，score 為 1–10 平均分
 */
export function semgrepScore(file) {
  const out = { results: [], score: 1 };

  if (!fs.existsSync(file)) {
    return out;
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rawResults = data.results || [];
  const allResults = rawResults.map((result) => {
    const severity = result.extra?.severity;
    const severityScore = severityToScore(severity);
    return { ...result, severityScore };
  });

  out.results = allResults;

  if (allResults.length === 0) {
    out.score = 0;
    return out;
  }

  const sum = allResults.reduce((acc, r) => acc + (r.severityScore ?? 0), 0);
  const avg = sum / allResults.length;
  out.score = Math.min(10, Math.max(1, Math.round(avg * 10) / 10));
  return out;
}
