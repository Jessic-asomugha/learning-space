const { checkAuth } = require("./_auth");

const HASH = "learningspace:topics";
const MAX_BYTES = 600000;

function dbConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cfg, command) {
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data || data.error) throw new Error((data && data.error) || "redis_" + r.status);
  return data.result;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!checkAuth(req, res)) return;

  const cfg = dbConfig();
  if (!cfg) return res.status(501).json({ error: "no_database" });

  try {
    if (req.method === "GET") {
      const flat = (await redis(cfg, ["HGETALL", HASH])) || [];
      const topics = [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        try {
          const t = JSON.parse(flat[i + 1]);
          t.id = flat[i];
          topics.push(t);
        } catch (e) { /* skip a damaged entry */ }
      }
      return res.status(200).json({ topics });
    }

    const id = String((req.query && req.query.id) || "");
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return res.status(400).json({ error: "bad_id" });

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ error: "bad_request" });
      const value = JSON.stringify(body);
      if (value.length > MAX_BYTES) return res.status(413).json({ error: "too_large" });
      await redis(cfg, ["HSET", HASH, id, value]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      await redis(cfg, ["HDEL", HASH, id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(502).json({ error: "database_error" });
  }
};
