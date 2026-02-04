import fs from 'fs';

function scoreFile(file) {
  if (!fs.existsSync(file)) return 5;
  const text = fs.readFileSync(file, 'utf8').toLowerCase();

  if (text.includes('critical')) return 9;
  if (text.includes('high')) return 7;
  if (text.includes('medium')) return 5;
  if (text.includes('low')) return 2;
  return 1;
}

export function scoreSast() {
  const semgrep = scoreFile('reports/semgrep.json');
  const codeql = scoreFile('reports/codeql.sarif');
  return Math.round((semgrep + codeql) / 2);
}

function scoreAI(file) {
  if (!fs.existsSync(file)) return 5;
  const data = JSON.parse(fs.readFileSync(file));
  const text = JSON.stringify(data).toLowerCase();

  if (text.includes('critical')) return 9;
  if (text.includes('high')) return 7;
  if (text.includes('medium')) return 5;
  if (text.includes('low')) return 2;
  return 1;
}

const sast = scoreSast();
const gemini = scoreAI('reports/gemini.json');
const openai = scoreAI('reports/openai.json');

const avg = ((sast + gemini + openai) / 3).toFixed(1);

let verdict = 'S3 PASS';
if (avg >= 9) verdict = 'S0 FAIL';
else if (avg >= 6) verdict = 'S1 FAIL';
else if (avg >= 3) verdict = 'S2 FAIL';

const result = {
  sast,
  gemini,
  openai,
  avg,
  verdict
};

fs.writeFileSync('reports/score.json', JSON.stringify(result, null, 2));
console.log(result);
