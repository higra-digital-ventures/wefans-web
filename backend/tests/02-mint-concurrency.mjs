const API = 'http://localhost:4000/api/v1';
const uid = Date.now();
const j = async (res) => { const t = await res.text(); try { return JSON.parse(t); } catch { return t; } };

// 1) registra usuário de teste
const reg = await j(await fetch(`${API}/auth/register`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: `mint_${uid}@wefans.test`, username: `mint_${String(uid).slice(-8)}`, password: 'senha1234' }),
}));
const auth = { authorization: `Bearer ${reg.accessToken}` };

// 2) acha um pacote grátis
const { packs } = await j(await fetch(`${API}/packs`));
const pack = packs.find((p) => p.priceCents === 0) ?? packs[0];

// 3) compra N pacotes (sequencial)
const N = 20;
const invIds = [];
for (let i = 0; i < N; i++) {
  const b = await j(await fetch(`${API}/packs/${pack.id}/buy`, { method: 'POST', headers: auth }));
  if (!b.inventoryId) { console.error('compra falhou:', b); process.exit(1); }
  invIds.push(b.inventoryId);
}

// 4) ABRE TODOS CONCORRENTEMENTE (estressa o mint)
const t0 = Date.now();
const results = await Promise.all(
  invIds.map((id) => fetch(`${API}/packs/inventory/${id}/open`, { method: 'POST', headers: auth }).then(j)),
);
const ms = Date.now() - t0;

const ok = results.filter((r) => Array.isArray(r.moments));
const errs = results.filter((r) => !Array.isArray(r.moments));
const total = ok.reduce((s, r) => s + r.moments.length, 0);

// distribuição de tiers minta
const tiers = {};
for (const r of ok) for (const m of r.moments) tiers[m.template.tier] = (tiers[m.template.tier] ?? 0) + 1;

console.log(JSON.stringify({
  pack: pack.name, N, momentCount: pack.momentCount,
  opensOk: ok.length, opensErro: errs.length,
  momentsMintados: total, esperado: N * pack.momentCount,
  ms, tiers, primeiroErro: errs[0] ?? null,
}, null, 2));
