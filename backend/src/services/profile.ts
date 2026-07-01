import type { PrismaClient, Prisma } from '@prisma/client';
import type { ServiceContext } from './context';
import { badRequest, notFound, unauthorized } from '../lib/errors';
import { toTeamDTO, toUserDTO } from '../lib/dto';

export async function getMe(ctx: ServiceContext) {
  const userId = ctx.userId;
  if (!userId) throw unauthorized();
  const user = await ctx.db.user.findUnique({ where: { id: userId }, include: { favoriteTeam: true } });
  if (!user) throw notFound('Usuário não encontrado');
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

/** Times visíveis ao público (PUBLICADO) — usado no seletor de "time seguido". */
export async function listPublishedTeams(db: PrismaClient | Prisma.TransactionClient) {
  const teams = await db.team.findMany({ where: { status: 'PUBLICADO' }, orderBy: { name: 'asc' } });
  return teams.map(toTeamDTO);
}
