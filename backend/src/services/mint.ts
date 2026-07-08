import { Prisma, Tier } from '@prisma/client';
import { conflict } from '../lib/errors';
import { recomputeUserScores } from '../lib/scores';
import { getRoyaltyConfig, creditTeam } from '../lib/royalty';

// Serviço de mint REUTILIZÁVEL (web, API e check-in usam o mesmo). Deve rodar dentro
// de uma $transaction. A unicidade do serial é garantida por um UPDATE ... RETURNING
// atômico (trava a linha do Template e devolve o novo mintedCount) — sem race.

const TIER_ORDER: Tier[] = [Tier.COMUM, Tier.TORCIDA, Tier.RARO, Tier.LENDARIO, Tier.GALACTICO];
const tierRank = (t: Tier) => TIER_ORDER.indexOf(t);

type Odds = Partial<Record<Tier, number>>;

interface PoolTemplate {
  id: string;
  tier: Tier;
  parallel: string;
  aspCents: number;
  teamId: string | null; // clube parceiro que fatura o royalty primário
}

interface MintablePack {
  momentCount: number;
  oddsJson: Prisma.JsonValue;
  guaranteeTier: Tier | null;
  priceCents: number;
  setId?: string | null; // se definido, o pack sorteia só deste Set (coleção)
}

function drawTier(odds: Odds): Tier {
  const entries = TIER_ORDER.filter((t) => (odds[t] ?? 0) > 0).map((t) => [t, odds[t] as number] as const);
  if (entries.length === 0) return Tier.COMUM;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [t, w] of entries) {
    r -= w;
    if (r <= 0) return t;
  }
  return entries[entries.length - 1][0];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Incrementa mintedCount/circulatingCount de forma atômica e devolve o novo serial.
 * O WHERE garante que edições LIMITADAS não estouram a tiragem. Retorna null se o
 * template escolhido esgotou (o chamador tenta outro candidato).
 */
async function claimSerial(tx: Prisma.TransactionClient, templateId: string): Promise<number | null> {
  const rows = await tx.$queryRaw<Array<{ mintedCount: number }>>(Prisma.sql`
    UPDATE "Template"
    SET "mintedCount" = "mintedCount" + 1, "circulatingCount" = "circulatingCount" + 1
    WHERE "id" = ${templateId} AND ("editionSize" IS NULL OR "mintedCount" < "editionSize")
    RETURNING "mintedCount"
  `);
  return rows.length ? Number(rows[0].mintedCount) : null;
}

async function mintSlot(
  tx: Prisma.TransactionClient,
  desired: Tier,
  byTier: Map<Tier, PoolTemplate[]>,
): Promise<{ template: PoolTemplate; serial: number } | null> {
  // Tenta o tier desejado; se esgotado, cai para tiers mais baixos (COMUM circulante
  // é sempre disponível); por fim tenta subir. Ordem de candidatos aleatória.
  const order = [
    ...Array.from({ length: tierRank(desired) + 1 }, (_, i) => tierRank(desired) - i),
    ...Array.from({ length: TIER_ORDER.length - tierRank(desired) - 1 }, (_, i) => tierRank(desired) + 1 + i),
  ];
  for (const rank of order) {
    for (const candidate of shuffle(byTier.get(TIER_ORDER[rank]) ?? [])) {
      const serial = await claimSerial(tx, candidate.id);
      if (serial !== null) return { template: candidate, serial };
    }
  }
  return null;
}

/** Minta pack.momentCount Moments para o usuário. Retorna os Moments criados (com template+player). */
export async function mintPack(tx: Prisma.TransactionClient, userId: string, pack: MintablePack) {
  // Pack ligado a um Set sorteia só daquele Set (padrão Top Shot: um pack revela
  // Moments da sua coleção). Se o Set não tiver catálogo, cai para o pool global.
  let pool = pack.setId
    ? await tx.template.findMany({
        where: { status: 'PUBLICADO', setId: pack.setId },
        select: { id: true, tier: true, parallel: true, aspCents: true, teamId: true },
      })
    : [];
  if (pool.length === 0) {
    pool = await tx.template.findMany({
      where: { status: 'PUBLICADO' },
      select: { id: true, tier: true, parallel: true, aspCents: true, teamId: true },
    });
  }
  if (pool.length === 0) throw conflict('Nenhum Momento publicado para criar');

  const byTier = new Map<Tier, PoolTemplate[]>();
  for (const t of pool) {
    const list = byTier.get(t.tier) ?? [];
    list.push(t);
    byTier.set(t.tier, list);
  }

  const odds = (pack.oddsJson ?? {}) as Odds;
  const tiers: Tier[] = Array.from({ length: pack.momentCount }, () => drawTier(odds));

  // Garantia de tier mínimo (regra 2): força o último slot se nenhum atingiu.
  if (pack.guaranteeTier && !tiers.some((t) => tierRank(t) >= tierRank(pack.guaranteeTier!))) {
    tiers[tiers.length - 1] = pack.guaranteeTier;
  }

  const priceShare = Math.floor(pack.priceCents / pack.momentCount);
  const royaltyCfg = await getRoyaltyConfig(tx);
  const mintedIds: string[] = [];
  let scoreSum = 0;

  for (const tier of tiers) {
    const slot = await mintSlot(tx, tier, byTier);
    if (!slot) throw conflict('Catálogo esgotado para criar este Momento');

    const acquiredPriceCents = priceShare;
    const topShotScore = Math.round((acquiredPriceCents / 100) * 10);
    const moment = await tx.moment.create({
      data: {
        templateId: slot.template.id,
        serial: slot.serial,
        ownerId: userId,
        parallel: slot.template.parallel,
        acquiredPriceCents,
        topShotScore,
      },
    });
    await tx.transaction.create({
      data: { type: 'MINT', momentId: moment.id, buyerId: userId, amountCents: acquiredPriceCents },
    });
    // royalty primário: parte do valor do pack vai pro clube parceiro do Momento
    if (slot.template.teamId && priceShare > 0) {
      const clubShare = Math.round((priceShare * royaltyCfg.primaryClubBps) / 10_000);
      await creditTeam(tx, slot.template.teamId, clubShare, 'PRIMARY', moment.id, 'Royalty de pacote');
    }
    mintedIds.push(moment.id);
    scoreSum += topShotScore;
  }

  if (scoreSum > 0) {
    await recomputeUserScores(tx, userId);
  }

  return tx.moment.findMany({
    where: { id: { in: mintedIds } },
    include: { template: { include: { player: true } } },
  });
}
