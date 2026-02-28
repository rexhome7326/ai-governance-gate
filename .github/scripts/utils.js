import fs from 'fs';

export const SRC_DIR = process.env.SCAN_DIR || 'src';
export const REPORTS_DIR = 'reports';

const CHECKLIST_PATH = new URL('./security_checklist_prompt.md', import.meta.url);
export const checklist = fs.readFileSync(CHECKLIST_PATH, 'utf8');

export function collectCode(dir) {
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

export function cleanMarkdown(raw) {
  return raw
    .replace(/^```(?:markdown|md)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

export function parseScore(md) {
  const match = md.match(/分數[：:]\s*(\d+)/);
  return match ? Math.min(10, Math.max(1, parseInt(match[1], 10))) : 5;
}

export function writeEmptyReport(engine, message) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const label = engine.charAt(0).toUpperCase() + engine.slice(1);
  fs.writeFileSync(
    `${REPORTS_DIR}/${engine}_report.md`,
    `# ${label} Scan\n\n${message}`
  );
  fs.writeFileSync(
    `${REPORTS_DIR}/${engine}.json`,
    JSON.stringify({ engine, score_hint: 0, summary: '無輸入' }, null, 2)
  );
}

export function writeReport(engine, rawMd, summary) {
  const md = cleanMarkdown(rawMd);
  const scoreHint = parseScore(md);
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(`${REPORTS_DIR}/${engine}_report.md`, md);
  fs.writeFileSync(
    `${REPORTS_DIR}/${engine}.json`,
    JSON.stringify(
      {
        engine,
        summary,
        severity: scoreHint >= 7 ? 'high' : scoreHint >= 4 ? 'medium' : 'low',
        score_hint: scoreHint,
        details: []
      },
      null,
      2
    )
  );
  console.log(`${engine} report and score written.`);
  return { md, scoreHint };
}

export async function fetchWithRetry(url, options, { maxRetries = 3, delayMs = 5000, label = 'API' } = {}) {
  const fetch = global.fetch;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    const data = await res.json();
    const non2xx = res.status < 200 || res.status >= 300;
    if (non2xx && attempt < maxRetries) {
      console.warn(
        `${label} HTTP ${res.status} (attempt ${attempt}/${maxRetries}), retry in ${delayMs / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    if (data?.error || non2xx) {
      throw new Error(data?.error?.message || `HTTP ${res.status}` || JSON.stringify(data?.error));
    }
    return data;
  }
}
