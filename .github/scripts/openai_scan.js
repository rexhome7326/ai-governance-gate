import fs from 'fs';
import fetch from 'node-fetch';

const API_KEY = process.env.OPENAI_API_KEY;
const SRC_DIR = process.env.SCAN_DIR || 'src';

/**
 * Collect all source code into one prompt
 */
function collectCode(dir) {
  let output = '';
  for (const f of fs.readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (fs.statSync(p).isDirectory()) {
      output += collectCode(p);
    } else if (f.match(/\.(js|ts|html|css|json)$/)) {
      const content = fs.readFileSync(p, 'utf8').slice(0, 6000);
      output += `\n\n### ${p}\n${content}`;
    }
  }
  return output;
}

async function scan() {
  if (!API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const code = collectCode(SRC_DIR);

  const prompt = `
You are an application security reviewer.
Return ONLY valid JSON in this exact format:
{
  "engine": "openai",
  "summary": "...",
  "severity": "low|medium|high|critical",
  "score_hint": 1-10,
  "details": ["issue1", "issue2"]
}

Review this code:
${code}
`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are a security code reviewer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/openai.json', raw);
}

scan();
