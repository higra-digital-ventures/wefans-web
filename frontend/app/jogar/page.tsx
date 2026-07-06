import Link from 'next/link';
import Countdown from '@/components/Countdown';
import FirstVisitBadge from '@/components/FirstVisitBadge';
import {
  getChallengesServer,
  getQuestsServer,
  getLeaderboardsServer,
  getChecklistsServer,
  getFastbreakRunsServer,
  getFastbreakDayServer,
  getMe,
} from '@/lib/api-server';

export const dynamic = 'force-dynamic';

// Hub do Jogar como lobby de jogo: "Continue jogando" com a MINHA próxima ação
// (rodada por escalar > prêmio por resgatar) e um card por modo com progresso
// pessoal, urgência (countdown) e recompensa — não um menu estático.

// rodada aberta "fecha" quando o dia do jogo vira (o cron fecha dias passados)
const dayDeadline = (gameDate: string) =>
  new Date(new Date(gameDate).getTime() + 24 * 60 * 60 * 1000).toISOString();

export default async function JogarPage() {
  const [challenges, quests, leaderboards, checklists, runs, me] = await Promise.all([
    getChallengesServer().catch(() => []),
    getQuestsServer().catch(() => []),
    getLeaderboardsServer().catch(() => []),
    getChecklistsServer().catch(() => []),
    getFastbreakRunsServer().catch(() => []),
    getMe(),
  ]);

  // estado das rodadas abertas (já escalei?) — detalhe dos até 3 primeiros dias
  const openDayRefs = runs
    .filter((r) => !r.eliminated)
    .flatMap((r) => r.days.filter((d) => !d.closed).map((d) => ({ run: r, id: d.id })))
    .slice(0, 3);
  const openDays = (
    await Promise.all(openDayRefs.map((ref) => getFastbreakDayServer(ref.id).catch(() => null)))
  ).filter((d): d is NonNullable<typeof d> => d != null);

  const pendingDay = me ? openDays.find((d) => !d.my?.submitted) : null;
  const submittedToday = me ? openDays.some((d) => d.my?.submitted) : false;
  const activeChallenges = challenges.filter((c) => c.active && !c.completed);
  const claimable = activeChallenges.find((c) => c.progress && c.progress.have >= c.progress.need);
  const nearest = [...activeChallenges]
    .filter((c) => c.progress && c.progress.have > 0)
    .sort((a, b) => b.progress!.have / b.progress!.need - a.progress!.have / a.progress!.need)[0];
  const soonestEnd = [...activeChallenges].sort((a, b) => a.endsAt.localeCompare(b.endsAt))[0];
  const bestChecklist = [...checklists]
    .filter((c) => c.progress && !c.claimed)
    .sort((a, b) => b.progress!.have / b.progress!.need - a.progress!.have / a.progress!.need)[0];
  const totalWins = runs.reduce((n, r) => n + r.myWins, 0);

  // "Continue jogando": rodada pendente > prêmio resgatável
  const cont = pendingDay
    ? {
        kicker: 'Rodada aberta — você ainda não escalou',
        title: `${pendingDay.runName} · Dia ${pendingDay.dayNumber}`,
        detail: `alvo ${pendingDay.targetScore} ${pendingDay.statKey}${pendingDay.survivor ? ' · mata-mata' : ''}`,
        deadline: dayDeadline(pendingDay.gameDate),
        cta: 'Escalar agora',
        href: `/jogar/matchday/dia/${pendingDay.id}`,
      }
    : claimable
      ? {
          kicker: 'Prêmio pronto para resgatar',
          title: claimable.name,
          detail: `${claimable.progress!.have}/${claimable.progress!.need} no álbum — falta só confirmar`,
          deadline: claimable.endsAt,
          cta: 'Resgatar prêmio',
          href: `/jogar/desafios/${claimable.id}`,
        }
      : null;

  const MODES = [
    {
      href: '/jogar/matchday',
      name: 'Matchday',
      color: '#21d4e0',
      description: 'Fantasy diário: escale 5 Lances, bata o alvo do dia e sobreviva ao mata-mata.',
      status: !me
        ? `${openDays.length} rodada${openDays.length !== 1 ? 's' : ''} aberta${openDays.length !== 1 ? 's' : ''}`
        : pendingDay
          ? 'você ainda não escalou hoje'
          : submittedToday
            ? 'escalação enviada ✓'
            : 'sem rodadas abertas',
      statusColor: me && pendingDay ? '#ff9e2c' : undefined,
      extra: me && totalWins > 0 ? `suas vitórias: ${totalWins}` : undefined,
      deadline: openDays[0] ? dayDeadline(openDays[0].gameDate) : null,
      reward: 'Prêmio: pack na 3ª vitória do run',
      d: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2 2.4 1.8-1 2.8h-2.9l-1-2.8Zm-7 8.3 2.9-.4 1.3 2.6-1.9 2.2-2.2-1.5a8 8 0 0 1-.1-2.9Zm3.8 7 .9-2.7h4.6l.9 2.7a8 8 0 0 1-6.4 0Zm9.4-2.6-1.9-2.2 1.3-2.6 2.9.4a8 8 0 0 1-2.3 4.4Z',
    },
    {
      href: '/jogar/desafios',
      name: 'Desafios',
      color: '#ff2e88',
      description: 'Feche o álbum com os Lances pedidos — ou bata figurinha — e leve prêmios.',
      status: claimable
        ? `${claimable.name} pronto — resgatar!`
        : nearest
          ? `${nearest.name}: ${nearest.progress!.have}/${nearest.progress!.need} no álbum`
          : `${activeChallenges.length} ativo${activeChallenges.length !== 1 ? 's' : ''} agora`,
      statusColor: claimable ? '#22c55e' : undefined,
      deadline: soonestEnd?.endsAt ?? null,
      reward: 'Prêmio: packs e Lances exclusivos',
      d: 'M18 4V2H6v2H2v3a5 5 0 0 0 5 5h.4A6 6 0 0 0 11 14.9V18H7v4h10v-4h-4v-3.1a6 6 0 0 0 3.6-2.9H17a5 5 0 0 0 5-5V4Z',
    },
    {
      href: '/jogar/rankings',
      name: 'Rankings',
      color: '#9d4edd',
      description: 'Trave Lances para pontuar no ranking do seu time ou jogador.',
      status: `${leaderboards.length} ranking${leaderboards.length !== 1 ? 's' : ''} em disputa`,
      deadline: null,
      reward: 'Prêmio: pack para o topo no snapshot',
      d: 'M4 22V10h4v12H4Zm6 0V2h4v20h-4Zm6 0v-8h4v8h-4Z',
    },
    {
      href: '/jogar/missoes',
      name: 'Missões',
      color: '#ff9e2c',
      description: 'Caças ao tesouro: monte vitrines e cumpra critérios especiais.',
      status: `${quests.length} missão${quests.length !== 1 ? '~es' : ''}`.replace('~', 'õ'),
      deadline: null,
      reward: 'Prêmio: Lances de recompensa',
      d: 'M12 2 9.5 8.5 2 9.3l5.5 4.9L5.8 22 12 18.3 18.2 22l-1.7-7.8L22 9.3l-7.5-.8Z',
    },
    {
      href: '/jogar/checklists',
      name: 'Checklists',
      color: '#22c55e',
      description: 'Complete a coleção de um time ou série inteira.',
      status: bestChecklist
        ? `${bestChecklist.name.replace('Checklist ', '')}: ${bestChecklist.progress!.have}/${bestChecklist.progress!.need}`
        : `${checklists.length} checklist${checklists.length !== 1 ? 's' : ''}`,
      statusColor:
        bestChecklist && bestChecklist.progress!.have >= bestChecklist.progress!.need ? '#22c55e' : undefined,
      deadline: null,
      reward: 'Prêmio: bônus de pontos no ranking',
      d: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z',
    },
    {
      href: '/checkin',
      name: 'Check-in',
      color: '#f7f7f8',
      description: 'Foi ao estádio? Faça check-in no jogo e ganhe um pacote de presença.',
      status: 'valendo em todo jogo da rodada',
      deadline: null,
      reward: 'Prêmio: pack de presença',
      d: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z',
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="mb-1 font-display text-4xl uppercase text-ink">Jogar</h1>
      <p className="mb-6 text-muted">
        Seus Lances não são só colecionáveis — são peças de jogo.
      </p>

      {/* Continue jogando: a MINHA próxima ação */}
      {cont && (
        <Link
          href={cont.href}
          className="relative mb-8 block overflow-hidden border border-line transition-colors hover:border-white/30"
        >
          <div className="absolute inset-0 bg-sunset opacity-25" aria-hidden />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ background: 'radial-gradient(100% 150% at 50% -30%, transparent 25%, #050505 95%)' }}
          />
          <div className="relative flex flex-wrap items-center gap-6 p-6">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent3">
                Continue jogando · {cont.kicker}
              </div>
              <div className="mt-1 font-display text-3xl uppercase leading-none text-white">
                {cont.title}
              </div>
              <div className="mt-1 text-sm text-neutral-300">{cont.detail}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                fecha em
              </div>
              <Countdown
                until={cont.deadline}
                endedLabel="instantes"
                className="font-display text-2xl uppercase leading-none text-accent3"
              />
            </div>
            <span className="rounded-lg bg-accent px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white">
              {cont.cta}
            </span>
          </div>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-2xl group flex flex-col overflow-hidden border border-line bg-panel transition-colors hover:border-white/30"
          >
            {/* faixa de arte (como os cards de drop) */}
            <div
              className="relative flex h-16 items-center justify-between px-4"
              style={{ background: `linear-gradient(120deg, ${m.color}33, #0a0a0b 80%)` }}
            >
              <span className="flex items-center gap-2 font-display text-2xl uppercase text-ink">
                {m.name}
                <FirstVisitBadge id={m.href} />
              </span>
              <svg viewBox="0 0 24 24" className="h-7 w-7 opacity-80" style={{ fill: m.color }} aria-hidden>
                <path d={m.d} />
              </svg>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="text-[12px] leading-snug text-muted">{m.description}</p>
              <div className="mt-3 text-[12px] font-bold" style={{ color: m.statusColor ?? m.color }}>
                {m.status}
                {m.extra && <span className="block font-semibold text-neutral-400">{m.extra}</span>}
              </div>
              {m.deadline && (
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  fecha em <Countdown until={m.deadline} endedLabel="instantes" />
                </div>
              )}
              <div className="mt-auto pt-3 text-[10px] uppercase tracking-wide text-neutral-500">
                {m.reward}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
