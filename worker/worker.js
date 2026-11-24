// occ-api — sincronização da app OCC Diário
// Cloudflare Worker com base de dados D1 ligada como "DB".
// Cada pessoa é identificada só pelo hash do seu código pessoal: o código nunca é guardado.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Key",
  "Access-Control-Max-Age": "86400",
};

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha256(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/health") return json({ ok: true, app: "occ-api" });

    const key = (req.headers.get("X-Key") || "").trim();
    if (key.length < 10 || key.length > 200) return json({ error: "código inválido" }, 401);
    const uid = await sha256(key + "|occ-v1");

    if (url.pathname === "/sync" && req.method === "POST") {
      let body;
      try { body = await req.json(); } catch { return json({ error: "pedido inválido" }, 400); }

      const now = Date.now();
      const docs = Array.isArray(body.docs) ? body.docs.slice(0, 1000) : [];
      const stmts = [];
      for (const d of docs) {
        if (!d || typeof d.id !== "string" || !/^[\w.:-]{1,64}$/.test(d.id)) continue;
        const data = JSON.stringify(d.data ?? null);
        if (data.length > 250000) continue;
        const updated = Number(d.updated) || now;
        stmts.push(
          env.DB.prepare(
            `INSERT INTO docs (uid, id, data, updated, srv) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT (uid, id) DO UPDATE SET data = excluded.data, updated = excluded.updated, srv = excluded.srv
             WHERE excluded.updated >= docs.updated`
          ).bind(uid, d.id, data, updated, now)
        );
      }
      for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

      const since = Number(body.since) || 0;
      const { results } = await env.DB.prepare(
        "SELECT id, data, updated FROM docs WHERE uid = ?1 AND srv > ?2"
      ).bind(uid, since).all();

      return json({
        now,
        docs: results.map((r) => ({ id: r.id, data: JSON.parse(r.data), updated: r.updated })),
      });
    }

    return json({ error: "não encontrado" }, 404);
  },
};
