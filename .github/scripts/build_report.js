import fs from 'fs';

const FILE_NAME = process.env.FILE_NAME || 'report';
const REPORTS_DIR = 'reports';

// 檔名僅保留安全字元，避免路徑與編碼問題
const safeName = String(FILE_NAME)
  .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, '_')
  .slice(0, 120) || 'report';

const scanTime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const reportFileName = `${safeName}_${scanTime}.md`;
const reportPath = `${REPORTS_DIR}/${reportFileName}`;
const source = `${REPORTS_DIR}/openai_report.md`;

if (fs.existsSync(source)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.copyFileSync(source, reportPath);
}

// 只輸出路徑，供 workflow 寫入 GITHUB_OUTPUT
console.log(reportPath);
