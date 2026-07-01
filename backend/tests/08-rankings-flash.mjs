const API = 'http://localhost:4000/api/v1';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const req = (m, p, b, a) => fetch(`${API}${p}`, { method: m, headers: { ...(b ? { 'content-type': 'application/json' } : {}), ...(a ?? {}) }, body: b ? JSON.stringify(b) : undefined }).then(j);
const get = (p, a) => req('GET', p, undefined, a);
const post = (p, b, a) => req('POST', p, b, a);
let pass = 0, fail = 0;
const check = (d, c, e = '') => { console.log(`  ${c ? '✅' : '❌'} ${d}${e ? ' → ' + e : ''}`); c ? pass++ : fail++; };

const cAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'colecionador@wefans.test', password: 'wefans123' })).accessToken}` };
const aAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'admin@wefans.test', password: 'wefans123' })).accessToken}` };

// ---------------- RANKINGS ----------------
const boards = (await get('/leaderboards', cAuth)).leaderboards;
check('2 rankings semeados (TEAM + PLAYER)', boards.length === 2 && boards.some((b) => b.kind === 'TEAM') && boards.some((b) => b.kind === 'PLAYER'));
const team = boards.find((b) => b.kind === 'TEAM');

const detail = (await get(`/leaderboards/${team.id}`, cAuth)).leaderboard;
check('Lances elegíveis do clube listados', detail.eligibleMoments.length >= 1, `${detail.eligibleMoments.length}`);
const elig = detail.eligibleMoments[0];

const lock = await post(`/leaderboards/${team.id}/lock`, { momentId: elig.id }, cAuth);
check('travar Lance pontua no ranking', lock.locked === true && lock.points === elig.points, `${lock.points} pts`);
check('mesmo Lance não trava 2x', /já (submetido|está travado)/.test((await post(`/leaderboards/${team.id}/lock`, { momentId: elig.id }, cAuth)).error?.message ?? ''));
check('Lance travado não lista no mercado', (await post('/listings', { momentId: elig.id, priceCents: 1000 }, cAuth)).error?.message?.includes('travado') ?? false);

// ---------------- CHECKLIST ----------------
const cls = (await get('/checklists', cAuth)).checklists;
const cl = cls[0];
check('checklist completo (progresso)', cl.progress.have === cl.progress.need, `${cl.progress.have}/${cl.progress.need}`);
const scoreBefore = (await get('/me', cAuth)).user.collectorScore;
const claim = await post(`/checklists/${cl.id}/claim`, undefined, cAuth);
check('resgatar bônus do checklist', claim.claimed === true && claim.bonusPoints === 500);
const scoreAfter = (await get('/me', cAuth)).user.collectorScore;
check('bônus entrou no Collector Score (+500)', scoreAfter - scoreBefore === 500, `${scoreBefore}→${scoreAfter}`);
const teamAfterClaim = (await get(`/leaderboards/${team.id}`, cAuth)).leaderboard;
const myEntry = teamAfterClaim.entries.find((e) => e.username === 'colecionador');
check('bônus somou no ranking do time', myEntry.points === elig.points + 500, `${myEntry.points}`);
check('checklist não resgata 2x', (await post(`/checklists/${cl.id}/claim`, undefined, cAuth)).error?.message?.includes('já resgatado') ?? false);

// ---------------- SNAPSHOT ----------------
check('não-admin não faz snapshot (403)', (await post(`/admin/leaderboards/${team.id}/snapshot`, undefined, cAuth)).error?.code === 'FORBIDDEN');
const packsBefore = (await get('/pack-market/mine', cAuth)).packs.length;
const snap = await post(`/admin/leaderboards/${team.id}/snapshot`, undefined, aAuth);
check('snapshot encerra e premia top1', snap.snapshot === true && snap.top1Rewarded === true);
const packsAfter = (await get('/pack-market/mine', cAuth)).packs.length;
check('top1 (colecionador) recebeu o pacote-prêmio', packsAfter - packsBefore === 1, `${packsBefore}→${packsAfter}`);
const afterSnap = (await get(`/leaderboards/${team.id}`, cAuth)).leaderboard;
check('rank #1 atribuído', afterSnap.entries[0].rank === 1 && afterSnap.snapshotAt !== null);
check('trava temporária liberada (lista de novo)', (await post('/listings', { momentId: elig.id, priceCents: 1000 }, cAuth)).listing?.id !== undefined || (await post('/listings', { momentId: elig.id, priceCents: 1000 }, cAuth)).error === undefined);
check('não trava mais após snapshot', (await post(`/leaderboards/${team.id}/lock`, { momentId: elig.id }, cAuth)).error?.message?.includes('encerrado') ?? false);

// ---------------- FLASH ----------------
const challenges = (await get('/challenges', cAuth)).challenges;
const flash = challenges.find((c) => c.type === 'FLASH');
check('desafio FLASH listado', !!flash);
const fd = (await get(`/challenges/${flash.id}`, cAuth)).challenge;
check('flash traz artilheiros de hoje (determinístico)', Array.isArray(fd.flash.scorersToday), `${fd.flash.scorersToday.length} marcaram`);
const fd2 = (await get(`/challenges/${flash.id}`, cAuth)).challenge;
check('sim é determinístico (mesma lista 2x)', JSON.stringify(fd.flash.scorersToday) === JSON.stringify(fd2.flash.scorersToday));
const flashClaim = await post(`/challenges/${flash.id}/submit`, { momentIds: [] }, cAuth);
if (fd.flash.eligible) {
  check('flash elegível → resgatou pacote', flashClaim.status === 'COMPLETED' && !!flashClaim.grantedPackInventoryId);
  check('flash não resgata 2x', (await post(`/challenges/${flash.id}/submit`, { momentIds: [] }, cAuth)).error?.message?.includes('já concluído') ?? false);
} else {
  check('flash inelegível → recusado com motivo', flashClaim.error?.message?.includes('não cumprido') ?? false, '(nenhum jogador seu marcou hoje)');
  check('flash continua não concluído', (await get(`/challenges/${flash.id}`, cAuth)).challenge.completed === false);
}

console.log(`\n==== ${pass} passaram, ${fail} falharam ====`);
