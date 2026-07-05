import type { PrismaClient, Prisma } from '@prisma/client';
import type { ServiceContext } from './context';
import { badRequest, notFound, unauthorized } from '../lib/errors';
import { toMomentDTO, toPublicUserDTO, toTeamDTO, toTemplateDTO, toUserDTO } from '../lib/dto';

export async function getMe(ctx: ServiceContext) {
  const userId = ctx.userId;
  if (!userId) throw unauthorized();
  const user = await ctx.db.user.findUnique({ where: { id: userId }, include: { favoriteTeam: true } });
  // Sessão válida cujo usuário não existe mais (ex.: banco re-semeado) = deslogado.
  if (!user) throw unauthorized();
  return toUserDTO(user, user.favoriteTeam);
}

export async function updateFavoriteTeam(db: PrismaClient, userId: string, teamId: string | null) {
  if (teamId) {
    const team = await db.team.findUnique({ where: { id: teamId } });
    // Regra de visibilidade (seção 10.1): só times PUBLICADO são seguíveis.
    if (!team || team.status !== 'PUBLICADO') throw badRequest('Time indisponível');
  }
  const user = await db.user.update({
    where: { id: userId },
    data: { favoriteTeamId: teamId },
    include: { favoriteTeam: true },
  });
  return toUserDTO(user, user.favoriteTeam);
}

export async function updateShowInFeed(db: PrismaClient, userId: string, showInFeed: boolean) {
  const user = await db.user.update({
    where: { id: userId },
    data: { showInFeed },
    include: { favoriteTeam: true },
  });
  return toUserDTO(user, user.favoriteTeam);
}

/** Times visíveis ao público (PUBLICADO) — usado no seletor de "time seguido". */
export async function listPublishedTeams(db: PrismaClient | Prisma.TransactionClient) {
  const teams = await db.team.findMany({ where: { status: 'PUBLICADO' }, orderBy: { name: 'asc' } });
  return teams.map(toTeamDTO);
}

/** Estatísticas do perfil: nº de Lances, distribuição por tier e histórico de pacotes abertos. */
export async function getMyStats(db: PrismaClient, userId: string) {
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { topShotScore: true, collectorScore: true },
  });
  const [moments, openedPacks, totalUsers, belowScore, belowCollector] = await Promise.all([
    db.moment.findMany({ where: { ownerId: userId, burned: false }, select: { template: { select: { tier: true } } } }),
    db.packInventory.findMany({
      where: { ownerId: userId, opened: true },
      include: { pack: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.user.count(),
    db.user.count({ where: { topShotScore: { lt: me?.topShotScore ?? 0 } } }),
    db.user.count({ where: { collectorScore: { lt: me?.collectorScore ?? 0 } } }),
  ]);
  const tierCounts: Record<string, number> = {};
  for (const m of moments) tierCounts[m.template.tier] = (tierCounts[m.template.tier] ?? 0) + 1;
  // percentil: "top X%" = fração de usuários com score MAIOR ou igual ao meu
  const topPct = (below: number) =>
    totalUsers > 1 ? Math.max(1, Math.round((1 - below / (totalUsers - 1)) * 100)) : 100;
  return {
    momentCount: moments.length,
    tierCounts,
    openedPacks: openedPacks.map((p) => ({ id: p.id, packName: p.pack.name, createdAt: p.createdAt.toISOString() })),
    percentile: { score: topPct(belowScore), collector: topPct(belowCollector) },
  };
}

/** Perfil público por username (não expõe e-mail/saldo). */
export async function getPublicProfile(db: PrismaClient, username: string) {
  const user = await db.user.findUnique({ where: { username }, include: { favoriteTeam: true } });
  if (!user) throw notFound('Perfil não encontrado');
  const momentCount = await db.moment.count({ where: { ownerId: user.id, burned: false } });
  return toPublicUserDTO(user, user.favoriteTeam, momentCount);
}

export async function getPublicCollection(db: PrismaClient, username: string) {
  const user = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw notFound('Perfil não encontrado');
  const moments = await db.moment.findMany({
    where: { ownerId: user.id, burned: false },
    include: { template: { include: { player: true } } },
    orderBy: { mintedAt: 'desc' },
  });
  return moments.map(toMomentDTO);
}

/** Wishlist pública do perfil (como a aba WISHLIST do Top Shot). */
export async function getPublicWishlist(db: PrismaClient, username: string) {
  const user = await db.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw notFound('Perfil não encontrado');
  const items = await db.wishlist.findMany({
    where: { userId: user.id },
    include: { template: { include: { player: true } } },
    orderBy: { createdAt: 'desc' },
    take: 24,
  });
  return items.map((w) => toTemplateDTO(w.template));
}
