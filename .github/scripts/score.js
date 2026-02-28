import fs from 'fs';
import { codeqlScore } from './score/codeqlScore.js';
import { semgrepScore } from './score/semgrepScore.js';
import { aiScore } from './score/aiScore.js';

const codeqlResult = codeqlScore('reports/codeql.sarif');
const semgrepResult = semgrepScore('reports/semgrep.json');
const geminiResult = aiScore('reports/gemini.json');
const openaiResult = aiScore('reports/openai.json');
const codeql = codeqlResult.score;
const semgrep = semgrepResult.score;
const gemini = geminiResult.score;
const openai = openaiResult.score;

const avg = ((codeql * 1 + semgrep * 1 + gemini * 4 + openai * 4) / 10).toFixed(1);

let verdict = 'S3 PASS';
if (avg >= 8) verdict = 'S0 FAIL';
else if (avg >= 5) verdict = 'S1 FAIL';
else if (avg >= 2) verdict = 'S2 WARNING';

const result = {
  codeql,
  semgrep,
  gemini,
  openai,
  avg,
  verdict
};

fs.writeFileSync('reports/score.json', JSON.stringify(result, null, 2));
console.log(result);
