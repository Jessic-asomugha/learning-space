const { checkAuth } = require("./_auth");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!checkAuth(req, res)) return;

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: "server_not_configured", detail: "GROQ_API_KEY is not set" });

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  const prompt = body && body.prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20000) {
    return res.status(400).json({ error: "bad_request" });
  }

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const payload = {
    model,
    messages: [
      { role: "system", content: "You are a patient web development tutor. Reply with one valid JSON object only. No markdown fences and no text outside the JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_completion_tokens: 4000
  };
  if (/gpt-oss/i.test(model)) payload.reasoning_effort = "low";

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 50000);
  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(payload),
      signal: ctl.signal
    });
    if (!r.ok) {
      if (r.status === 429) {
        const retry = parseInt(r.headers.get("retry-after") || "", 10);
        return res.status(429).json({ error: "rate_limited", retryAfter: Number.isFinite(retry) ? retry : 60 });
      }
      if (r.status === 401 || r.status === 403) return res.status(502).json({ error: "groq_key_rejected" });
      const text = await r.text().catch(() => "");
      if (r.status === 400 && /json_validate_failed|failed to generate json/i.test(text)) {
        return res.status(502).json({ error: "bad_output" });
      }
      return res.status(502).json({ error: "groq_error", status: r.status });
    }
    const data = await r.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof text !== "string" || !text.trim()) return res.status(502).json({ error: "bad_output" });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(504).json({ error: e && e.name === "AbortError" ? "timeout" : "upstream_unreachable" });
  } finally {
    clearTimeout(timer);
  }
};

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
