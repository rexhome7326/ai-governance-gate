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

const avg = ((codeql * 3 + semgrep * 3 + gemini * 2 + openai * 2) / 10).toFixed(1);

let verdict = 'S3 PASS';
if (avg >= 9) verdict = 'S0 FAIL';
else if (avg >= 6) verdict = 'S1 FAIL';
else if (avg >= 3) verdict = 'S2 FAIL';

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
