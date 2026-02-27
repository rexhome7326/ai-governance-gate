import fs from 'fs';
import { codeqlScore } from './score/codeqlScore.js';
import { semgrepScore } from './score/semgrepScore.js';

const REPORTS_DIR = 'reports';

/**
 * 從 CodeQL SARIF 的 result 取出 message、path、line，並帶上 1–10 分數。
 * 分數 1 為不嚴重，10 為最嚴重。
 */
function codeqlToErrors(codeqlResult) {
  const errors = (codeqlResult.results || []).map((r) => {
    const loc = r.locations?.[0]?.physicalLocation;
    const path = loc?.artifactLocation?.uri ?? '';
    const line = loc?.region?.startLine ?? 0;
    const message = r.message?.text ?? r.message ?? '';
    const score = Math.min(10, Math.max(1, (r.securitySeverity ?? 1)));
    return { tool: 'codeql', message, path, line, score };
  });
  return { score: codeqlResult.score, errors };
}

/**
 * 從 Semgrep JSON 的 result 取出 message、path、line，並帶上 1–10 分數。
 */
function semgrepToErrors(semgrepResult) {
  const errors = (semgrepResult.results || []).map((r) => {
    const path = r.path ?? '';
    const line = r.start?.line ?? 0;
    const message = r.extra?.message ?? r.message ?? '';
    const score = Math.min(10, Math.max(1, (r.severityScore ?? 1)));
    return { tool: 'semgrep', message, path, line, score };
  });
  return { score: semgrepResult.score, errors };
}

function main() {
  const codeqlFile = `${REPORTS_DIR}/codeql.sarif`;
  const semgrepFile = `${REPORTS_DIR}/semgrep.json`;

  const codeqlResult = fs.existsSync(codeqlFile)
    ? codeqlScore(codeqlFile)
    : { results: [], score: 0 };
  const semgrepResult = fs.existsSync(semgrepFile)
    ? semgrepScore(semgrepFile)
    : { results: [], score: 0 };

  const codeql = codeqlToErrors(codeqlResult);
  const semgrep = semgrepToErrors(semgrepResult);

  const output = {
    codeql: { score: codeql.score, errors: codeql.errors },
    semgrep: { score: semgrep.score, errors: semgrep.errors }
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(
    `${REPORTS_DIR}/codeql_semgrep_errors.json`,
    JSON.stringify(output, null, 2)
  );
  console.log(JSON.stringify(output, null, 2));
}

main();
