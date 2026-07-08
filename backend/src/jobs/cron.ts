import type { PrismaClient } from '@prisma/client';
import { closeDay } from '../services/fastbreak';
import { tickDrops } from '../services/drops';

// Runner de cron no backend (seções 1 e 10.1): promove conteúdo agendado, expira
// ofertas, encerra drops vencidos e fecha rodadas passadas do Matchday.
const INTERVAL_MS = 60_000;

export async function cronTick(db: PrismaClient, log: (msg: string, meta?: unknown) => void = () => {}) {
  const now = new Date();

  // 1) AGENDADO → PUBLICADO (Team, Series, Set, Template)
  const promoted: Record<string, number> = {};
  promoted.team = (await db.team.updateMany({ where: { status: 'AGENDADO', publishAt: { lte: now } }, data: { status: 'PUBLICADO' } })).count;
  promoted.series = (await db.series.updateMany({ where: { status: 'AGENDADO', publishAt: { lte: now } }, data: { status: 'PUBLICADO' } })).count;
  promoted.set = (await db.set.updateMany({ where: { status: 'AGENDADO', publishAt: { lte: now } }, data: { status: 'PUBLICADO' } })).count;
  promoted.template = (await db.template.updateMany({ where: { status: 'AGENDADO', publishAt: { lte: now } }, data: { status: 'PUBLICADO' } })).count;
  const totalPromoted = Object.values(promoted).reduce((a, b) => a + b, 0);
  if (totalPromoted > 0) log('cron: conteúdo agendado publicado', promoted);

  // 2) ofertas expiradas
  const expired = await db.offer.updateMany({ where: { status: 'ACTIVE', expiresAt: { lt: now } }, data: { status: 'EXPIRED' } });
  if (expired.count > 0) log(`cron: ${expired.count} oferta(s) expirada(s)`);

  // 3) ciclo dos drops (padrão Top Shot): abre sala de espera, INICIA no horário
  // (sorteia a fila) e encerra no fim — tudo automático, sem admin.
  const drops = await tickDrops(db);
  if (drops.opened > 0) log(`cron: ${drops.opened} sala(s) de espera aberta(s)`);
  if (drops.started > 0) log(`cron: ${drops.started} drop(s) iniciado(s)`);
  if (drops.ended > 0) log(`cron: ${drops.ended} drop(s) encerrado(s)`);
  const ended = { count: drops.ended };

  // 4) fecha rodadas do Matchday com gameDate anterior a hoje (UTC)
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const staleDays = await db.fastBreakDay.findMany({ where: { closedAt: null, gameDate: { lt: startOfToday } }, select: { id: true } });
  for (const d of staleDays) {
    try {
      await closeDay(db, d.id);
      log(`cron: rodada ${d.id} fechada`);
    } catch {
      /* corrida com fechamento manual — ignora */
    }
  }

  return { promoted: totalPromoted, expiredOffers: expired.count, endedDrops: ended.count, closedDays: staleDays.length };
}

export function startCron(db: PrismaClient, log: (msg: string, meta?: unknown) => void) {
  const run = () => cronTick(db, log).catch((e) => log('cron: erro no tick', { error: String(e) }));
  run();
  const handle = setInterval(run, INTERVAL_MS);
  handle.unref(); // não segura o processo vivo
  return handle;
}
