import type { ServiceContext } from './context';

/**
 * Contagens agregadas do catálogo/economia. Usado pelo endpoint de diagnóstico
 * /api/v1/system/stats — prova a ligação frontend → API → serviço → banco.
 */
export async function getSystemStats(ctx: ServiceContext) {
  const { db } = ctx;
  const [
    users,
    series,
    sets,
    players,
    templates,
    moments,
    packs,
    drops,
    teams,
    stadiums,
    fixtures,
    challenges,
  ] = await Promise.all([
    db.user.count(),
    db.series.count(),
    db.set.count(),
    db.player.count(),
    db.template.count(),
    db.moment.count(),
    db.pack.count(),
    db.drop.count(),
    db.team.count(),
    db.stadium.count(),
    db.fixture.count(),
    db.challenge.count(),
  ]);

  return {
    users,
    series,
    sets,
    players,
    templates,
    moments,
    packs,
    drops,
    teams,
    stadiums,
    fixtures,
    challenges,
  };
}
