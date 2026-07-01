import { Prisma, type PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { badRequest } from '../lib/errors';
import { haversineMeters } from '../lib/geo';
import { withDbRetry } from '../lib/tx';
import { env } from '../env';

// Check-in por geolocalização (A2). Validação 100% server-side: NÃO confie no cliente.
const MAX_ACCURACY_M = 100; // precisão pior que isto é rejeitada (A2.2 item 4)
const TELEPORT_KMH = 300; // velocidade impossível entre estádios → revisão (item 6)
const NONCE_TTL_MS = 2 * 60 * 1000;

/**
 * Verificação de atestado de dispositivo (A2.2 item 3). No app Flutter real seria
 * Firebase App Check (Play Integrity / App Attest) verificado no servidor. Ainda não
 * há app, então em dev aceitamos tokens "dev-*"; em produção, exige verificação real.
 */
function verifyAttestation(token: string): boolean {
  if (!token) return false;
  if (env.NODE_ENV !== 'production') return token === 'dev-ok' || token.startsWith('dev-');
  return false; // TODO(app): verificar App Check no servidor
}

export interface CheckinInput {
  fixtureId: string;
  lat: number;
  lng: number;
  accuracy: number;
  isMock: boolean;
  attestationToken: string;
  nonce: string;
}

export type CheckinResult =
  | { status: 'VALID'; grantedPackInventoryId: string }
  | { status: 'REVIEW'; reason: string }
  | { status: 'REJECTED'; reason: string };

/** Jogos do time seguido com a janela de check-in aberta agora. */
export async function getActiveFixtures(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { favoriteTeamId: true } });
  if (!user?.favoriteTeamId) return [];
  const now = new Date();
  const fixtures = await db.fixture.findMany({
    where: {
      OR: [{ homeTeamId: user.favoriteTeamId }, { awayTeamId: user.favoriteTeamId }],
      checkinOpensAt: { lte: now },
      checkinClosesAt: { gte: now },
    },
    include: { homeTeam: true, awayTeam: true, stadium: true, rewardPack: { select: { name: true } } },
  });
  const done = await db.checkIn.findMany({
    where: { userId, fixtureId: { in: fixtures.map((f) => f.id) }, status: { in: ['VALID', 'REVIEW'] } },
    select: { fixtureId: true, status: true },
  });
  const doneMap = new Map(done.map((d) => [d.fixtureId, d.status]));
  return fixtures.map((f) => ({
    id: f.id,
    homeTeam: f.homeTeam.name,
    awayTeam: f.awayTeam.name,
    stadium: { name: f.stadium.name, city: f.stadium.city, lat: f.stadium.lat, lng: f.stadium.lng, radiusMeters: f.stadium.radiusMeters },
    kickoffAt: f.kickoffAt.toISOString(),
    checkinClosesAt: f.checkinClosesAt.toISOString(),
    rewardPackName: f.rewardPack.name,
    checkinStatus: doneMap.get(f.id) ?? null,
  }));
}

export async function createNonce(db: PrismaClient, userId: string) {
  const value = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await db.checkinNonce.create({ data: { value, userId, expiresAt } });
  return { nonce: value, expiresAt: expiresAt.toISOString() };
}

export async function submitCheckin(db: PrismaClient, userId: string, input: CheckinInput): Promise<CheckinResult> {
  const reject = (reason: string): CheckinResult => ({ status: 'REJECTED', reason });

  // 7) nonce (challenge-response): válido, do usuário, não usado e não expirado.
  const nrec = await db.checkinNonce.findUnique({ where: { value: input.nonce } });
  if (!nrec || nrec.userId !== userId || nrec.usedAt || nrec.expiresAt < new Date()) {
    return reject('nonce inválido ou expirado');
  }
  await db.checkinNonce.update({ where: { id: nrec.id }, data: { usedAt: new Date() } });

  // 1) jogo válido
  const fixture = await db.fixture.findUnique({ where: { id: input.fixtureId }, include: { stadium: true } });
  if (!fixture) return reject('jogo não encontrado');

  // segue um time do jogo?
  const user = await db.user.findUnique({ where: { id: userId }, select: { favoriteTeamId: true } });
  if (!user?.favoriteTeamId || (fixture.homeTeamId !== user.favoriteTeamId && fixture.awayTeamId !== user.favoriteTeamId)) {
    return reject('você não segue um time deste jogo');
  }

  // 1) janela de check-in aberta
  const now = new Date();
  if (now < fixture.checkinOpensAt || now > fixture.checkinClosesAt) return reject('fora da janela de check-in');

  // 5) unicidade — 1 check-in válido/em-revisão por jogo
  const existing = await db.checkIn.findUnique({ where: { userId_fixtureId: { userId, fixtureId: input.fixtureId } } });
  if (existing && (existing.status === 'VALID' || existing.status === 'REVIEW')) {
    return reject('check-in já registrado para este jogo');
  }

  // 4) sinais de mock / precisão
  if (input.isMock) return reject('GPS simulado detectado');
  if (!(input.accuracy > 0) || input.accuracy > MAX_ACCURACY_M) return reject('precisão de localização insuficiente');

  // 3) atestado de dispositivo
  if (!verifyAttestation(input.attestationToken)) return reject('atestado de dispositivo inválido');

  // 2) geofence (haversine)
  const dist = haversineMeters(input.lat, input.lng, fixture.stadium.lat, fixture.stadium.lng);
  if (dist > fixture.stadium.radiusMeters) return reject(`fora do raio do estádio (${Math.round(dist)}m > ${fixture.stadium.radiusMeters}m)`);

  // 6) teleport/velocidade impossível → REVIEW (sem auto-grant)
  const lastValid = await db.checkIn.findFirst({
    where: { userId, status: 'VALID', fixtureId: { not: input.fixtureId } },
    orderBy: { createdAt: 'desc' },
    include: { fixture: { include: { stadium: true } } },
  });
  if (lastValid) {
    const km = haversineMeters(fixture.stadium.lat, fixture.stadium.lng, lastValid.fixture.stadium.lat, lastValid.fixture.stadium.lng) / 1000;
    const hours = (now.getTime() - lastValid.createdAt.getTime()) / 3_600_000;
    const speed = hours > 0 ? km / hours : Infinity;
    if (km > 1 && speed > TELEPORT_KMH) {
      await db.checkIn.create({
        data: { userId, fixtureId: input.fixtureId, lat: input.lat, lng: input.lng, accuracyM: input.accuracy, isMock: input.isMock, attestationOk: true, status: 'REVIEW', rejectionReason: `velocidade impossível (${Math.round(speed)} km/h)` },
      });
      return { status: 'REVIEW', reason: 'sinais suspeitos — enviado para revisão da fraude' };
    }
  }

  // 8) tudo ok → VALID: minta o pacote (PackInventory) atômico; unique evita grant duplo.
  try {
    return await withDbRetry(() =>
      db.$transaction(async (tx) => {
        const inv = await tx.packInventory.create({ data: { packId: fixture.rewardPackId, ownerId: userId } });
        await tx.checkIn.create({
          data: { userId, fixtureId: input.fixtureId, lat: input.lat, lng: input.lng, accuracyM: input.accuracy, isMock: input.isMock, attestationOk: true, status: 'VALID', grantedPackInventoryId: inv.id },
        });
        return { status: 'VALID' as const, grantedPackInventoryId: inv.id };
      }),
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return reject('check-in já registrado para este jogo');
    }
    throw e;
  }
}

export async function getHistory(db: PrismaClient, userId: string) {
  const checkins = await db.checkIn.findMany({
    where: { userId },
    include: { fixture: { include: { homeTeam: true, awayTeam: true, stadium: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return checkins.map((c) => ({
    id: c.id,
    status: c.status,
    reason: c.rejectionReason,
    grantedPackInventoryId: c.grantedPackInventoryId,
    createdAt: c.createdAt.toISOString(),
    fixture: { home: c.fixture.homeTeam.name, away: c.fixture.awayTeam.name, stadium: c.fixture.stadium.name },
  }));
}

// ------------------------------------------------- admin: fila de revisão de fraude

export async function listReviewCheckins(db: PrismaClient) {
  const checkins = await db.checkIn.findMany({
    where: { status: 'REVIEW' },
    include: { fixture: { include: { homeTeam: true, awayTeam: true, stadium: { select: { name: true } } } }, user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return checkins.map((c) => ({
    id: c.id,
    username: c.user.username,
    reason: c.rejectionReason,
    lat: c.lat,
    lng: c.lng,
    accuracyM: c.accuracyM,
    createdAt: c.createdAt.toISOString(),
    fixture: { home: c.fixture.homeTeam.name, away: c.fixture.awayTeam.name, stadium: c.fixture.stadium.name },
  }));
}

export async function resolveCheckin(db: PrismaClient, checkinId: string, approve: boolean) {
  return withDbRetry(() =>
    db.$transaction(async (tx) => {
      const c = await tx.checkIn.findUnique({ where: { id: checkinId }, include: { fixture: true } });
      if (!c || c.status !== 'REVIEW') throw badRequest('check-in não está em revisão');
      if (approve) {
        const inv = await tx.packInventory.create({ data: { packId: c.fixture.rewardPackId, ownerId: c.userId } });
        await tx.checkIn.update({ where: { id: c.id }, data: { status: 'VALID', grantedPackInventoryId: inv.id, rejectionReason: null } });
        return { status: 'VALID' as const, grantedPackInventoryId: inv.id };
      }
      await tx.checkIn.update({ where: { id: c.id }, data: { status: 'REJECTED' } });
      return { status: 'REJECTED' as const };
    }),
  );
}
