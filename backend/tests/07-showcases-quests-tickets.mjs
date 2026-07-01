const API = 'http://localhost:4000/api/v1';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const req = (m, p, b, a) => fetch(`${API}${p}`, { method: m, headers: { ...(b ? { 'content-type': 'application/json' } : {}), ...(a ?? {}) }, body: b ? JSON.stringify(b) : undefined }).then(j);
const get = (p, a) => req('GET', p, undefined, a);
const post = (p, b, a) => req('POST', p, b, a);
let pass = 0, fail = 0;
const check = (d, c, e = '') => { console.log(`  ${c ? '✅' : '❌'} ${d}${e ? ' → ' + e : ''}`); c ? pass++ : fail++; };

const cAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'colecionador@wefans.test', password: 'wefans123' })).accessToken}` };
const aAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'admin@wefans.test', password: 'wefans123' })).accessToken}` };
const collection = async () => (await get('/collection', cAuth)).moments;
let col = await collection();

// ---------------- VITRINES ----------------
const scA = (await post('/showcases', { name: 'Top Golaços', description: 'meus favoritos', public: true }, cAuth)).showcase;
check('criar vitrine', !!scA.id);
await post(`/showcases/${scA.id}/items`, { momentId: col[0].id }, cAuth);
await post(`/showcases/${scA.id}/items`, { momentId: col[1].id }, cAuth);
check('não adiciona Lance repetido', (await post(`/showcases/${scA.id}/items`, { momentId: col[0].id }, cAuth)).error?.message?.includes('já está') ?? false);
const scAfull = (await get(`/showcases/${scA.id}`, cAuth)).showcase;
check('vitrine tem 2 itens', scAfull.items.length === 2);
check('aparece nas minhas vitrines', (await get('/showcases/mine', cAuth)).showcases.some((s) => s.id === scA.id));
check('aparece nas vitrines públicas', (await get('/showcases')).showcases.some((s) => s.id === scA.id));
check('renomear vitrine', (await req('PATCH', `/showcases/${scA.id}`, { name: 'Golaços 2026' }, cAuth)).showcase.name === 'Golaços 2026');
await req('DELETE', `/showcases/${scA.id}/items/${col[0].id}`, undefined, cAuth);
check('remover item', (await get(`/showcases/${scA.id}`, cAuth)).showcase.items.length === 1);
// visibilidade: privada não é vista por outro
const scPriv = (await post('/showcases', { name: 'privada', public: false }, cAuth)).showcase;
check('vitrine privada oculta para terceiros', (await get(`/showcases/${scPriv.id}`, aAuth)).error?.code === 'NOT_FOUND');
check('deletar vitrine', (await req('DELETE', `/showcases/${scA.id}`, undefined, cAuth)).ok === true);

// ---------------- MISSÕES ----------------
const scQ = (await post('/showcases', { name: 'Volta ao Mundo', public: true }, cAuth)).showcase;
for (const m of col) await post(`/showcases/${scQ.id}/items`, { momentId: m.id }, cAuth); // cobre 3 competições
const quests = (await get('/quests', cAuth)).quests;
const q = quests[0];
check('missão elegível após montar vitrine', q.eligible === true && q.claimed === false);
const claim = await post(`/quests/${q.id}/claim`, undefined, cAuth);
check('resgatar missão → recompensa', claim.status === 'CLAIMED' && !!claim.rewardMomentId);
check('recompensa é do colecionador', (await get(`/moments/${claim.rewardMomentId}`)).moment.ownerUsername === 'colecionador');
check('missão não resgata 2x', (await post(`/quests/${q.id}/claim`, undefined, cAuth)).error?.message?.includes('já resgatada') ?? false);

// ---------------- FICHAS DE TROCA ----------------
const ticketsBefore = (await get('/me', cAuth)).user.tradeTickets;
col = await collection();
const toRedeem = col.slice(0, 3);
for (const m of toRedeem) await post(`/moments/${m.id}/redeem-ticket`, undefined, cAuth);
const ticketsAfter = (await get('/me', cAuth)).user.tradeTickets;
check('cada Lance vira 1 ficha (+3)', ticketsAfter - ticketsBefore === 3, `${ticketsBefore}→${ticketsAfter}`);
check('Lance trocado foi queimado', (await get(`/moments/${toRedeem[0].id}`)).moment.burned === true);
const tp = (await get('/tickets/packs')).packs;
check('pacotes ticketOnly listados', tp.length >= 1 && tp[0].ticketCost === 3);
const redeemPack = await post(`/tickets/packs/${tp[0].id}/redeem`, undefined, cAuth);
check('trocar 3 fichas por pacote', !!redeemPack.inventoryId && redeemPack.tradeTickets === ticketsAfter - 3);
check('sem fichas suficientes → recusa', (await post(`/tickets/packs/${tp[0].id}/redeem`, undefined, cAuth)).error?.message?.includes('insuficientes') ?? false);

console.log(`\n==== ${pass} passaram, ${fail} falharam ====`);
