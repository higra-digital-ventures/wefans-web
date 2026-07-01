const API = 'http://localhost:4000/api/v1';
const scheduledFixtureId = process.argv[2];
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
let pass = 0, fail = 0;
const check = (desc, cond, extra = '') => { console.log(`  ${cond ? '✅' : '❌'} ${desc}${extra ? ' → ' + extra : ''}`); cond ? pass++ : fail++; };

const login = await j(await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'colecionador@wefans.test', password: 'wefans123' }) }));
const auth = { authorization: `Bearer ${login.accessToken}` };
const nonce = async () => (await j(await fetch(`${API}/checkin/nonce`, { headers: auth }))).nonce;
const attempt = (body) => fetch(`${API}/checkin`, { method: 'POST', headers: { 'content-type': 'application/json', ...auth }, body: JSON.stringify(body) }).then(j);

const fixtures = (await j(await fetch(`${API}/fixtures/active`, { headers: auth }))).fixtures;
const live = fixtures[0];
console.log(`Jogo ao vivo: ${live?.homeTeam} x ${live?.awayTeam} @ ${live?.stadium.name} (raio ${live?.stadium.radiusMeters}m)`);
const S = live.stadium;
const ok = { fixtureId: live.id, lat: S.lat, lng: S.lng, accuracy: 15, isMock: false, attestationToken: 'dev-ok' };

check('fixtures/active traz o jogo do time seguido', !!live && live.checkinStatus === null);

// rejeições (cada uma com nonce novo)
check('fora do raio → REJECTED', (await attempt({ ...ok, lat: S.lat + 0.1, nonce: await nonce() })).reason?.includes('raio') ?? false);
check('GPS simulado → REJECTED', (await attempt({ ...ok, isMock: true, nonce: await nonce() })).reason?.includes('simulado') ?? false);
check('precisão ruim → REJECTED', (await attempt({ ...ok, accuracy: 500, nonce: await nonce() })).reason?.includes('precisão') ?? false);
check('atestado inválido → REJECTED', (await attempt({ ...ok, attestationToken: 'bad', nonce: await nonce() })).reason?.includes('atestado') ?? false);
check('nonce inválido → REJECTED', (await attempt({ ...ok, nonce: 'garbage' })).reason?.includes('nonce') ?? false);
check('fora da janela (jogo agendado) → REJECTED', (await attempt({ ...ok, fixtureId: scheduledFixtureId, nonce: await nonce() })).reason?.includes('janela') ?? false);

// nonce single-use: consome num reject, reusa → nonce inválido
const nRe = await nonce();
await attempt({ ...ok, lat: S.lat + 0.1, nonce: nRe }); // consome (reject por raio)
check('nonce é single-use (reuso → REJECTED)', (await attempt({ ...ok, nonce: nRe })).reason?.includes('nonce') ?? false);

// happy path → VALID + pacote
const valid = await attempt({ ...ok, nonce: await nonce() });
check('dentro do raio + janela + atestado ok → VALID', valid.status === 'VALID', valid.status);
check('VALID concede um pacote (grantedPackInventoryId)', !!valid.grantedPackInventoryId);

// abre o pacote concedido → minta Moments (reuso do serviço de mint)
let opened = { moments: [] };
if (valid.grantedPackInventoryId) {
  opened = await j(await fetch(`${API}/packs/inventory/${valid.grantedPackInventoryId}/open`, { method: 'POST', headers: auth }));
}
check('pacote do check-in abre e minta Moments', Array.isArray(opened.moments) && opened.moments.length > 0, `${opened.moments?.length} lances`);

// duplicado → REJECTED
check('segundo check-in no mesmo jogo → REJECTED (nunca duplica)', (await attempt({ ...ok, nonce: await nonce() })).reason?.includes('já registrado') ?? false);

// histórico
const hist = (await j(await fetch(`${API}/checkin/history`, { headers: auth }))).checkins;
check('histórico mostra o check-in VALID', hist.some((h) => h.fixture && h.status === 'VALID'));

console.log(`\n==== ${pass} passaram, ${fail} falharam ====`);
