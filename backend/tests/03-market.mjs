const API = 'http://localhost:4000/api/v1';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const post = (path, body, auth) => fetch(`${API}${path}`, { method: 'POST', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(auth ?? {}) }, body: body ? JSON.stringify(body) : undefined });
let pass = 0, fail = 0;
const check = (desc, cond, extra = '') => { console.log(`  ${cond ? '✅' : '❌'} ${desc}${extra ? ' → ' + extra : ''}`); cond ? pass++ : fail++; };

// vendedor
const sLogin = await j(await post('/auth/login', { email: 'colecionador@wefans.test', password: 'wefans123' }));
const sAuth = { authorization: `Bearer ${sLogin.accessToken}` };
const sBefore = (await j(await fetch(`${API}/me`, { headers: sAuth }))).user;
const col = (await j(await fetch(`${API}/collection`, { headers: sAuth }))).moments;

const m0 = col[0];
const m1 = col.find((m) => m.template.id !== m0.template.id) ?? col[1];
const asp0 = m0.template.aspCents, asp1 = m1.template.aspCents;
const price0 = Math.max(2, asp0 * 2);   // 2× ASP → NÃO anômalo
const price1 = Math.max(4, asp1 * 5);   // 5× ASP → anômalo (flag)
const fee0 = Math.round(price0 * 0.05), fee1 = Math.round(price1 * 0.05);

const l0 = (await j(await post('/listings', { momentId: m0.id, priceCents: price0 }, sAuth))).listing;
const l1 = (await j(await post('/listings', { momentId: m1.id, priceCents: price1 }, sAuth))).listing;

// vendedor não pode comprar o próprio anúncio
const ownBuy = await post(`/listings/${l1.id}/buy`, undefined, sAuth);

// comprador
const bLogin = await j(await post('/auth/register', { email: `buyer_${Date.now()}@wefans.test`, username: `buyer_${String(Date.now()).slice(-8)}`, password: 'senha1234' }));
const bAuth = { authorization: `Bearer ${bLogin.accessToken}` };
await post('/wallet/deposit', { amountCents: price0 + price1 + 10000 }, bAuth);
const bAfterDeposit = (await j(await fetch(`${API}/me`, { headers: bAuth }))).user;

console.log('DEBUG bLogin token?', !!bLogin.accessToken, '| l0?', JSON.stringify(l0), '| l1?', JSON.stringify(l1));
const buy0 = await j(await post(`/listings/${l0.id}/buy`, undefined, bAuth));
const buy1 = await j(await post(`/listings/${l1.id}/buy`, undefined, bAuth));
console.log('DEBUG buy0:', JSON.stringify(buy0), '| buy1:', JSON.stringify(buy1));

const sAfter = (await j(await fetch(`${API}/me`, { headers: sAuth }))).user;
const bAfter = (await j(await fetch(`${API}/me`, { headers: bAuth }))).user;
const mom0 = (await j(await fetch(`${API}/moments/${m0.id}`))).moment;
const tm0 = await j(await fetch(`${API}/market/template/${m0.template.id}`));
const activity = (await j(await fetch(`${API}/market/activity`))).sales;

console.log(`Venda 0: ASP=${asp0} preço=${price0} taxa=${fee0} | Venda 1: ASP=${asp1} preço=${price1} taxa=${fee1}`);
check('vendedor não compra o próprio anúncio (400)', ownBuy.status === 400, String(ownBuy.status));
check('comprador debitado por ambas as compras', bAfterDeposit.balanceCents - bAfter.balanceCents === price0 + price1);
check('vendedor creditado (preço - 5%) nas duas', sAfter.balanceCents - sBefore.balanceCents === (price0 - fee0) + (price1 - fee1));
check('dono do Momento 0 agora é o comprador', mom0.ownerUsername === bAfter.username, mom0.ownerUsername);
check('venda normal NÃO sinalizada', buy0.flagged === false);
check('venda 5×ASP sinalizada (anti-anômalo)', buy1.flagged === true);
check('ASP da edição 0 virou o preço da venda', tm0.aspCents === price0, `${tm0.aspCents}`);
check('Pontuação wefans do comprador = soma dos 2 (dinâmica)', bAfter.topShotScore === Math.round(price0 / 10) + Math.round(price1 / 10), `${bAfter.topShotScore}`);
check('Pontuação do vendedor caiu', sAfter.topShotScore < sBefore.topShotScore, `${sBefore.topShotScore}→${sAfter.topShotScore}`);
check('Procedência do Momento 0 = MINT depois BUY', JSON.stringify(mom0.provenance.map((p) => p.type)) === JSON.stringify(['MINT', 'BUY']));
check('feed de atividade traz as 2 vendas', activity.filter((s) => [m0.id, m1.id].includes(s.momentId)).length === 2);

console.log(`\n==== ${pass} passaram, ${fail} falharam ====`);
