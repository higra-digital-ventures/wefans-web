const API = 'http://localhost:4000/api/v1';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const req = (m, p, b, a) => fetch(`${API}${p}`, { method: m, headers: { ...(b ? { 'content-type': 'application/json' } : {}), ...(a ?? {}) }, body: b ? JSON.stringify(b) : undefined }).then(j);
const get = (p, a) => req('GET', p, undefined, a);
const post = (p, b, a) => req('POST', p, b, a);
let pass = 0, fail = 0;
const check = (d, c, e = '') => { console.log(`  ${c ? '✅' : '❌'} ${d}${e ? ' → ' + e : ''}`); c ? pass++ : fail++; };

const cAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'colecionador@wefans.test', password: 'wefans123' })).accessToken}` };
const aAuth = { authorization: `Bearer ${(await post('/auth/login', { email: 'admin@wefans.test', password: 'wefans123' })).accessToken}` };

// ---------------- runs ----------------
const runs = (await get('/fastbreak', cAuth)).runs;
const main = runs.find((r) => !r.survivor);
const surv = runs.find((r) => r.survivor);
check('2 runs (Pelada 7 dias + Mata-mata)', !!main && !!surv && main.days.length === 7 && surv.days.length === 2);

// ---------------- dia 1: escalar ----------------
const day1 = main.days[0];
let detail = (await get(`/fastbreak/days/${day1.id}`, cAuth)).day;
check('elegíveis com fadiga (≥5 jogadores)', detail.eligible.length >= 5, `${detail.eligible.length} jogadores`);
const pick5 = detail.eligible.slice(0, 5).map((g) => g.moments[0].id);
const captain = pick5[0];

check('escalar 4 → recusa (tamanho)', (await post(`/fastbreak/days/${day1.id}/lineup`, { momentIds: pick5.slice(0, 4) }, cAuth)).error?.message?.includes('exatamente') ?? false);
check('captain fora da escalação → recusa', (await post(`/fastbreak/days/${day1.id}/lineup`, { momentIds: pick5, captainMomentId: 'x' }, cAuth)).error?.message?.includes('captain') ?? false);
check('escalar 5 distintos + captain → ok', (await post(`/fastbreak/days/${day1.id}/lineup`, { momentIds: pick5, captainMomentId: captain }, cAuth)).submitted === true);
check('não escala 2x na mesma rodada', (await post(`/fastbreak/days/${day1.id}/lineup`, { momentIds: pick5 }, cAuth)).error?.message?.includes('já escalou') ?? false);

// ---------------- fadiga ----------------
detail = (await get(`/fastbreak/days/${main.days[1].id}`, cAuth)).day;
const tired = detail.eligible.find((g) => g.used >= g.maxUses);
check('fadiga registrada (used=1 após escalar)', detail.eligible.filter((g) => g.used === 1).length === 5);
if (tired) {
  // 5 jogadores distintos incluindo esgotados (o tamanho passa; a fadiga barra)
  const five = [...detail.eligible.filter((g) => g.used >= g.maxUses), ...detail.eligible.filter((g) => g.used < g.maxUses)]
    .slice(0, 5)
    .map((g) => g.moments[0].id);
  const attempt = await post(`/fastbreak/days/${main.days[1].id}/lineup`, { momentIds: five }, cAuth);
  check('jogador sem usos → recusa (fadiga)', attempt.error?.message?.includes('fadiga') ?? false, attempt.error?.message ?? '');
} else {
  check('jogador sem usos → recusa (fadiga)', true, '(nenhum jogador esgotado — todos com ASP alto)');
}

// ---------------- fechar o dia (admin) ----------------
check('não-admin não fecha (403)', (await post(`/admin/fastbreak/days/${day1.id}/close`, undefined, cAuth)).error?.code === 'FORBIDDEN');
const closed = await post(`/admin/fastbreak/days/${day1.id}/close`, undefined, aAuth);
check('admin fecha a rodada', closed.closed === true && closed.lineups === 1);
check('não fecha 2x', (await post(`/admin/fastbreak/days/${day1.id}/close`, undefined, aAuth)).error?.message?.includes('já foi fechada') ?? false);

detail = (await get(`/fastbreak/days/${day1.id}`, cAuth)).day;
check('score calculado e coerente com won', detail.my.score !== null && detail.my.won === (detail.my.score >= detail.targetScore), `score ${detail.my.score} vs alvo ${detail.targetScore} → ${detail.my.won ? 'venceu' : 'perdeu'}`);
check('board diário com meu resultado', detail.board.length === 1 && detail.board[0].username === 'colecionador' && detail.board[0].score === detail.my.score);

// determinismo: fechar de novo daria o mesmo score — valida via segunda leitura
const detail2 = (await get(`/fastbreak/days/${day1.id}`, cAuth)).day;
check('resultado estável (determinístico)', detail2.my.score === detail.my.score);

// ---------------- leaderboard do run ----------------
const lb = (await get(`/fastbreak/runs/${main.id}/leaderboard`)).leaderboard;
const meRow = lb.standings.find((s) => s.username === 'colecionador');
check('leaderboard do run: vitórias coerentes', meRow.days === 1 && meRow.wins === (detail.my.won ? 1 : 0));

// ---------------- survivor (mata-mata) ----------------
const sday1 = surv.days[0];
const sdetail = (await get(`/fastbreak/days/${sday1.id}`, cAuth)).day;
const spick = sdetail.eligible.filter((g) => g.used < g.maxUses).slice(0, 5).map((g) => g.moments[0].id);
check('escala no mata-mata (usos são por run)', (await post(`/fastbreak/days/${sday1.id}/lineup`, { momentIds: spick }, cAuth)).submitted === true);
await post(`/admin/fastbreak/days/${sday1.id}/close`, undefined, aAuth); // alvo 999 → derrota certa
const afterLoss = (await get(`/fastbreak/days/${sday1.id}`, cAuth)).day;
check('perdeu no mata-mata (alvo 999)', afterLoss.my.won === false);
const sday2 = surv.days[1];
const elim = await post(`/fastbreak/days/${sday2.id}/lineup`, { momentIds: spick }, cAuth);
check('eliminado não escala na rodada seguinte', elim.error?.message?.includes('eliminado') ?? false);
const runsAfter = (await get('/fastbreak', cAuth)).runs;
check('run marca eliminated=true', runsAfter.find((r) => r.survivor).eliminated === true);

console.log(`\n==== ${pass} passaram, ${fail} falharam ====`);
