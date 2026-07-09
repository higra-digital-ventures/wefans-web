const API = 'http://localhost:4000/api/v1';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const post = (p, b, a) => fetch(`${API}${p}`, { method: 'POST', headers: { ...(b ? { 'content-type': 'application/json' } : {}), ...(a ?? {}) }, body: b ? JSON.stringify(b) : undefined }).then(j);
const get = (p, a) => fetch(`${API}${p}`, { headers: a ?? {} }).then(j);
const del = (p, a) => fetch(`${API}${p}`, { method: 'DELETE', headers: a ?? {} }).then(j);
let pass = 0, fail = 0;
const check = (d, c, e = '') => { console.log(`  ${c ? '✅' : '❌'} ${d}${e ? ' → ' + e : ''}`); c ? pass++ : fail++; };

const cAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'colecionador@wefans.test', password: 'wefans123' })).accessToken}` };
const aAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'admin@wefans.test', password: 'wefans123' })).accessToken}` };
const collection = async () => (await get('/collection', cAuth)).moments;

// ---------------- DESAFIOS ----------------
const challenges = (await get('/challenges', cAuth)).challenges;
const std = challenges.find((c) => c.type === 'STANDARD');
const craft = challenges.find((c) => c.type === 'CRAFTING');

const stdDetail = (await get(`/challenges/${std.id}`, cAuth)).challenge;
const stdMoments = stdDetail.required.map((r) => r.eligible[0]?.id).filter(Boolean);
check('STANDARD: elegibilidade cobre os exigidos', stdMoments.length === stdDetail.required.length);
const stdRes = await post(`/challenges/${std.id}/submit`, { momentIds: stdMoments }, cAuth);
check('STANDARD concluído → concede pacote', stdRes.status === 'COMPLETED' && !!stdRes.grantedPackInventoryId);
check('STANDARD duplo bloqueado', (await post(`/challenges/${std.id}/submit`, { momentIds: stdMoments }, cAuth)).error?.message?.includes('já concluído') ?? false);

const craftDetail = (await get(`/challenges/${craft.id}`, cAuth)).challenge;
const craftMoments = craftDetail.required.map((r) => r.eligible[0]?.id).filter(Boolean);
const burnedEntryId = craftMoments[0];
const craftRes = await post(`/challenges/${craft.id}/submit`, { momentIds: craftMoments }, cAuth);
check('CRAFTING concluído → concede Lance de recompensa', craftRes.status === 'COMPLETED' && !!craftRes.rewardMomentId);
check('CRAFTING queimou a entrada', (await get(`/moments/${burnedEntryId}`)).moment.burned === true);
const reward = (await get(`/moments/${craftRes.rewardMomentId}`)).moment;
check('recompensa é Galáctico do colecionador', reward.template.tier === 'GALACTICO' && reward.ownerUsername === 'colecionador');

// ---------------- TRAVAR ----------------
let col = await collection();
const lend = col.find((m) => m.template.tier === 'LENDARIO');
check('travar OK', (await post(`/moments/${lend.id}/lock`, undefined, cAuth)).locked === true);
check('travado NÃO queima', (await post(`/moments/${lend.id}/burn`, undefined, cAuth)).error?.message?.includes('travado') ?? false);
check('travado NÃO presenteia', (await post(`/moments/${lend.id}/gift`, { toUsername: 'admin' }, cAuth)).error?.message?.includes('travado') ?? false);
check('travado NÃO lista', (await post('/listings', { momentId: lend.id, priceCents: 1000 }, cAuth)).error?.message?.includes('travado') ?? false);

// ---------------- OFERTAS ----------------
col = await collection();
const raro = col.find((m) => m.template.tier === 'RARO');
check('não oferta no próprio Momento', (await post('/offers', { momentId: raro.id, priceCents: 5000 }, cAuth)).error?.message?.includes('dono') ?? false);
const offer = (await post('/offers', { templateId: raro.template.id, priceCents: 5000 }, aAuth)).offer;
check('oferta de edição criada', !!offer?.id);
check('dono vê a oferta no Momento', (await get(`/moments/${raro.id}/offers`)).offers.some((o) => o.id === offer.id));
const cBefore = (await get('/me', cAuth)).user.balanceCents;
const accept = await post(`/offers/${offer.id}/accept`, { momentId: raro.id }, cAuth);
check('oferta aceita → venda executada', !!accept.momentId);
check('Momento transferido ao comprador (admin)', (await get(`/moments/${raro.id}`)).moment.ownerUsername === 'admin');
const cAfter = (await get('/me', cAuth)).user.balanceCents;
check('vendedor recebeu preço − 10% (5% plataforma + 5% clube)', cAfter - cBefore === 5000 - 2 * Math.round(5000 * 0.05), `${cAfter - cBefore}`);
// oferta cancelável
const off2 = (await post('/offers', { templateId: raro.template.id, priceCents: 1000 }, aAuth)).offer;
check('cancelar oferta', (await del(`/offers/${off2.id}`, aAuth)).ok === true);

// ---------------- PRESENTEAR ----------------
col = await collection();
const gift = col.find((m) => m.template.tier === 'GALACTICO');
check('presentear OK', (await post(`/moments/${gift.id}/gift`, { toUsername: 'admin' }, cAuth)).gifted === true);
check('presente foi para o admin', (await get(`/moments/${gift.id}`)).moment.ownerUsername === 'admin');

// ---------------- QUEIMAR ----------------
col = await collection();
const comum = col.find((m) => m.template.tier === 'COMUM');
const beforeCirc = comum.template.circulatingCount;
check('queimar OK', (await post(`/moments/${comum.id}/burn`, undefined, cAuth)).burned === true);
const burned = (await get(`/moments/${comum.id}`)).moment;
check('queimado: burned + dono nulo', burned.burned === true && burned.ownerUsername === null);
check('circulatingCount decrementado', burned.template.circulatingCount === beforeCirc - 1, `${beforeCirc}→${burned.template.circulatingCount}`);

console.log(`\n==== ${pass} passaram, ${fail} falharam ====`);
