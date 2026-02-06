import fs from 'fs';

/** 從 SARIF 的 run 裡依 result.rule / result.ruleId 解析出對應的 rule 物件 */
function getRuleByResult(run, result) {
  const tool = run.tool;
  const tcIndex = result.rule?.toolComponent?.index ?? 0;
  const ruleIndex = result.rule?.index ?? result.ruleIndex;
  if (ruleIndex != null) {
    if (tcIndex === 0) {
      const r = tool.driver?.rules?.[ruleIndex];
      if (r) return r;
    } else {
      const ext = tool.extensions?.[tcIndex - 1];
      if (ext?.rules?.[ruleIndex]) return ext.rules[ruleIndex];
    }
  }
  const ruleId = result.ruleId ?? result.rule?.id;
  if (!ruleId) return null;
  for (const rule of tool.driver?.rules ?? []) {
    if (rule.id === ruleId) return rule;
  }
  for (const ext of tool.extensions ?? []) {
    for (const rule of ext.rules ?? []) {
      if (rule.id === ruleId) return rule;
    }
  }
  return null;
}

/** 取得單一 result 的 security-severity（0–10），沒有則回傳 undefined */
function getSecuritySeverityFromRule(run, result) {
  const rule = getRuleByResult(run, result);
  const raw = rule?.properties?.['security-severity'];
  if (raw == null) return undefined;
  const n = parseFloat(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** 依 result.level 對應成 security-severity 數字（無 rule 時 fallback） */
function levelToSeverity(level) {
  if (level == null) return 1;
  const l = String(level).toLowerCase();
  if (l === 'error') return 7.5;
  if (l === 'warning') return 5;
  if (l === 'note') return 2.5;
  return 1;
}

/**
 * 讀取 CodeQL SARIF，為每個 result 掛上 securitySeverity，並依加總平均算出分數。
 * @param {string} file - SARIF 檔案路徑（例如 'reports/codeql.sarif'）
 * @returns {{ results: Array, score: number }} results 為帶有 securitySeverity 的 result 陣列，score 為 1–10 平均分
 */
export function codeqlScore(file) {
  const out = { results: [], score: 1 };

  if (!fs.existsSync(file)) {
    return out;
  }

  const sarif = JSON.parse(fs.readFileSync(file, 'utf8'));
  const runs = sarif.runs || [];
  const allResults = [];

  for (const run of runs) {
    const rawResults = run.results || [];
    for (const result of rawResults) {
      const fromRule = getSecuritySeverityFromRule(run, result);
      const securitySeverity = fromRule ?? levelToSeverity(result.level);
      const enriched = { ...result, securitySeverity };
      allResults.push(enriched);
    }
  }

  out.results = allResults;

  if (allResults.length === 0) {
    out.score = 1;
    return out;
  }

  const sum = allResults.reduce((acc, r) => acc + (r.securitySeverity ?? 0), 0);
  const avg = sum / allResults.length;
  out.score = Math.min(10, Math.max(1, Math.round(avg * 10) / 10));
  return out;
}
