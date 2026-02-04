import fs from 'fs';

const codeql = JSON.parse(fs.readFileSync('reports/codeql.sarif'));
const semgrep = JSON.parse(fs.readFileSync('reports/semgrep.json'));
const gemini = JSON.parse(fs.readFileSync('reports/gemini.json'));
const openai = JSON.parse(fs.readFileSync('reports/openai.json'));

fs.writeFileSync('reports/report.md', `
# AI Security Review Report

## CodeQL
${JSON.stringify(codeql, null, 2)}

## Semgrep
${JSON.stringify(semgrep, null, 2)}

## Gemini
${JSON.stringify(gemini, null, 2)}

## OpenAI
${JSON.stringify(openai, null, 2)}
`);
