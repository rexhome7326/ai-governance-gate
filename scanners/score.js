import fs from "fs";

let codeScore = 10;
if (fs.existsSync("semgrep.json")) {
  const issues = JSON.parse(fs.readFileSync("semgrep.json")).results || [];
  codeScore = Math.max(1, 10 - issues.length);
}

fs.writeFileSync(".score_code", codeScore.toString());

console.log(`# AI Review Report


## Code Scan Score
${codeScore}


## Gemini Score
${fs.readFileSync(".score_gemini", "utf8")}
`);
