const API = 'http://localhost:4000/api/v1';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const post = (p, b, a) => fetch(`${API}${p}`, { method: 'POST', headers: { ...(b ? { 'content-type': 'application/json' } : {}), ...(a ?? {}) }, body: b ? JSON.stringify(b) : undefined }).then(j);
const get = (p, a) => fetch(`${API}${p}`, { headers: a ?? {} }).then(j);
let pass = 0, fail = 0;
const check = (d, c, e = '') => { console.log(`  ${c ? '✅' : '❌'} ${d}${e ? ' → ' + e : ''}`); c ? pass++ : fail++; };

const cAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'colecionador@wefans.test', password: 'wefans123' })).accessToken}` };
const aAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'admin@wefans.test', password: 'wefans123' })).accessToken}` };
const zAuth = { authorization: `Bearer ${(await post('/auth/register', { email: `z_${Date.now()}@wefans.test`, username: `z_${String(Date.now()).slice(-8)}`, password: 'senha1234' })).accessToken}` };

const drops = (await get('/drops')).drops;
const dropA = drops.find((d) => d.name.includes('Estreia'));
const dropB = drops.find((d) => d.name.includes('Relâmpago'));
const packA = dropA.packs[0].id;
const packB = dropB.packs[0].id;

// 1) Collector Score
const cMe = (await get('/me', cAuth)).user;
check('Score do Colecionador calculado (tiers)', cMe.collectorScore === 6701, String(cMe.collectorScore));

// 2) requisito de score na fila
check('score baixo NÃO entra na fila', (await post(`/drops/${dropA.id}/join`, undefined, zAuth)).error?.message?.includes('insuficiente') ?? false);
check('colecionador entra na fila', (await post(`/drops/${dropA.id}/join`, undefined, cAuth)).joined === true);
check('admin entra na fila', (await post(`/drops/${dropA.id}/join`, undefined, aAuth)).joined === true);
check('não entra duas vezes', (await post(`/drops/${dropA.id}/join`, undefined, cAuth)).error?.message?.includes('já está') ?? false);

// 3) iniciar (admin) + fila aleatória + janela
check('não-admin não inicia (403)', (await post(`/admin/drops/${dropA.id}/start`, undefined, cAuth)).error?.code === 'FORBIDDEN');
const started = await post(`/admin/drops/${dropA.id}/start`, undefined, aAuth);
check('drop iniciado com 2 posições', started.started === true && started.positions === 2);
const cEntry = (await get(`/drops/${dropA.id}`, cAuth)).drop.myEntry;
const aEntry = (await get(`/drops/${dropA.id}`, aAuth)).drop.myEntry;
check('posições 1 e 2 atribuídas', [cEntry.position, aEntry.position].sort().join(',') === '1,2');
const pos1 = cEntry.position === 1 ? cAuth : aAuth;
const pos2 = cEntry.position === 2 ? cAuth : aAuth;
const e1 = cEntry.position === 1 ? cEntry : aEntry;
const e2 = cEntry.position === 2 ? cEntry : aEntry;
check('posição 1 pode comprar agora', e1.canBuyNow === true);
check('posição 2 ainda não (janela futura)', e2.canBuyNow === false && e2.canRebound === false);
check('posição 1 compra na janela', !!(await post(`/drops/${dropA.id}/buy`, { packId: packA }, pos1)).inventoryId);
check('posição 2 bloqueada (aguarde)', (await post(`/drops/${dropA.id}/buy`, { packId: packA }, pos2)).error?.message?.includes('Aguarde') ?? false);

// 4) rebound (Drop B — colecionador com janela já passada)
const bEntry = (await get(`/drops/${dropB.id}`, cAuth)).drop.myEntry;
check('Drop B: rebound disponível (janela passou)', bEntry.canRebound === true && bEntry.canBuyNow === false);
const buyR = await post(`/drops/${dropB.id}/buy`, { packId: packB }, cAuth);
check('compra via rebound', !!buyR.inventoryId && buyR.viaRebound === true);

// 5) Mercado de Pacotes
const market = (await get('/pack-market')).listings;
check('mercado de pacotes tem 2 anúncios', market.length === 2, String(market.length));
const pl = market[0];
check('vendedor não compra o próprio pacote', (await post(`/pack-market/${pl.id}/buy`, undefined, aAuth)).error?.message?.includes('próprio') ?? false);
const cBalBefore = (await get('/me', cAuth)).user.balanceCents;
const buyPL = await post(`/pack-market/${pl.id}/buy`, undefined, cAuth);
check('colecionador compra pacote lacrado', !!buyPL.packInventoryId);
const cBalAfter = (await get('/me', cAuth)).user.balanceCents;
check('saldo debitado pelo preço do pacote', cBalBefore - cBalAfter === pl.priceCents, `${cBalBefore - cBalAfter}`);
const mine = (await get('/pack-market/mine', cAuth)).packs;
check('pacote comprado aparece em "meus pacotes"', mine.some((p) => p.id === buyPL.packInventoryId));
const toList = mine.find((p) => !p.listed);
check('listar um pacote lacrado', (await post('/pack-market/list', { packInventoryId: toList.id, priceCents: 6000 }, cAuth)).listed === true);

console.log(`\n==== ${pass} passaram, ${fail} falharam ====`);
