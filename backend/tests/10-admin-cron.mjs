const API = 'http://localhost:4000/api/v1';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const req = (m, p, b, a) => fetch(`${API}${p}`, { method: m, headers: { ...(b ? { 'content-type': 'application/json' } : {}), ...(a ?? {}) }, body: b ? JSON.stringify(b) : undefined }).then(j);
const get = (p, a) => req('GET', p, undefined, a);
const post = (p, b, a) => req('POST', p, b, a);
let pass = 0, fail = 0;
const check = (d, c, e = '') => { console.log(`  ${c ? '✅' : '❌'} ${d}${e ? ' → ' + e : ''}`); c ? pass++ : fail++; };

const cAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'colecionador@wefans.test', password: 'wefans123' })).accessToken}` };
const aAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'admin@wefans.test', password: 'wefans123' })).accessToken}` };

// guard
check('não-admin bloqueado em /admin/metrics (403)', (await get('/admin/metrics', cAuth)).error?.code === 'FORBIDDEN');

// métricas
const m = await get('/admin/metrics', aAuth);
check('métricas: usuários/moments/mercado', m.users >= 2 && m.moments.total > 0 && typeof m.market.volumeCents === 'number', `${m.users} users, ${m.moments.total} moments, vol ${m.market.volumeCents}`);

// parceria: criar time+estádio → conteúdo em rascunho → liberar → visível → pausar → oculto
const team = await post('/admin/teams', { name: 'Furacão Azul', stadiumName: 'Arena Ciclone', city: 'Recife', lat: -8.05, lng: -34.9, radiusMeters: 350 }, aAuth);
check('criar time + estádio', !!team.id && !!team.stadiumId);
const teamsList = (await get('/admin/teams', aAuth)).teams;
const created = teamsList.find((t) => t.id === team.id);
check('novo time em RASCUNHO/PROSPECT', created.status === 'RASCUNHO' && created.partnerStatus === 'PROSPECT');

const series = (await get('/catalog/series')).series[0];
const player = await post('/admin/players', { name: 'Ciclone Jr.', club: 'Furacão Azul', position: 'ATA', jersey: 9, nationality: 'Ventania' }, aAuth);
const tpl = await post('/admin/templates', { playerId: player.id, seriesId: series.id, teamId: team.id, title: 'Golaço do Furacão', playType: 'GOL', competition: 'Liga Aurora', tier: 'RARO', editionType: 'LIMITADA', editionSize: 50 }, aAuth);
check('criar player + template (rascunho)', !!player.id && !!tpl.id);
const pubBefore = (await get('/catalog/templates?tier=RARO')).templates.some((t) => t.id === tpl.id);
check('rascunho invisível no catálogo público', pubBefore === false);

const rel = await post(`/admin/teams/${team.id}/release`, undefined, aAuth);
check('liberar parceria publica o conteúdo', rel.released === true && rel.templatesPublished === 1);
check('template visível após liberar', (await get('/catalog/templates?tier=RARO')).templates.some((t) => t.id === tpl.id));
const pause = await post(`/admin/teams/${team.id}/pause`, undefined, aAuth);
check('pausar parceria oculta o conteúdo', pause.paused === true && !(await get('/catalog/templates?tier=RARO')).templates.some((t) => t.id === tpl.id));

// ciclo: agendar com publishAt no passado → cron tick promove
await post(`/admin/content/template/${tpl.id}/status`, { action: 'schedule', publishAt: new Date(Date.now() - 1000).toISOString() }, aAuth);
const tick = await post('/admin/cron/tick', undefined, aAuth);
check('cron tick promove AGENDADO→PUBLICADO', tick.promoted >= 1, `${tick.promoted} promovidos`);
check('template publicado pelo cron', (await get('/catalog/templates?tier=RARO')).templates.some((t) => t.id === tpl.id));

// cron: oferta expirada
const raro = (await get('/collection', cAuth)).moments[0];
const off = (await post('/offers', { templateId: raro.template.id, priceCents: 500, expiresAt: new Date(Date.now() - 1000).toISOString() }, aAuth)).offer;
const tick2 = await post('/admin/cron/tick', undefined, aAuth);
check('cron expira ofertas vencidas', tick2.expiredOffers >= 1);

// fixture
const packs = (await get('/packs')).packs;
const fx = await post('/admin/fixtures', { homeTeamId: team.id, awayTeamId: teamsList[0].id, kickoffAt: new Date(Date.now() + 86400000).toISOString(), rewardPackId: packs[0].id }, aAuth);
check('criar fixture (janela derivada do kickoff)', !!fx.id);
check('fixture listada no admin', (await get('/admin/fixtures', aAuth)).fixtures.some((f) => f.id === fx.id));

// mint de cortesia
const before = (await get('/users/colecionador')).profile.momentCount;
const mint = await post('/admin/mint', { templateId: tpl.id, username: 'colecionador' }, aAuth);
check('mint de cortesia', !!mint.momentId && mint.serial === 1);
check('coleção do usuário +1', (await get('/users/colecionador')).profile.momentCount === before + 1);

// auditoria
const logs = (await get('/admin/audit', aAuth)).logs;
check('audit log registra ações (release, mint, cron…)', ['partnership.release', 'mint.courtesy', 'cron.tick'].every((a) => logs.some((l) => l.action === a)), `${logs.length} entradas`);

console.log(`\n==== ${pass} passaram, ${fail} falharam ====`);
