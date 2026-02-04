import fs from 'fs';

const fetch = global.fetch;
const API_KEY = process.env.GEMINI_API_KEY;
const SRC_DIR = process.env.SCAN_DIR || 'src';

function collectCode(dir) {
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

async function scan() {
  const code = collectCode(SRC_DIR);

  const prompt = `
You are an application security reviewer.
Return ONLY JSON with this format:
{
  "engine": "gemini",
  "summary": "...",
  "severity": "low|medium|high|critical",
  "score_hint": 1-10,
  "details": ["issue1", "issue2"]
}

Review this code:
${code}
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/gemini.json', raw);
}

scan();
