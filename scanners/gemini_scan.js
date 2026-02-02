import fs from "fs";
import fetch from "node-fetch";

const apiKey = process.env.GEMINI_API_KEY;

const code = fs.readFileSync("reports/report.md", "utf8");

const prompt = `You are a security auditor. Score this project from 1-10.\n\n${code}`;

const res = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
    apiKey,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  },
);

const json = await res.json();
const score = json.candidates[0].content.parts[0].text.match(/(\d+)/)[1];

fs.writeFileSync(".score_gemini", score);
