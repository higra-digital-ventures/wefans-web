import 'dotenv/config';
import { PrismaClient, Tier, EditionType, ChallengeType, TxType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Conteúdo 100% fictício (ver .claude/LEGAL.md). Determinístico onde possível.
const now = new Date();
const mins = (n: number) => new Date(now.getTime() + n * 60_000);
const hours = (n: number) => new Date(now.getTime() + n * 3_600_000);
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
const pick = <T>(arr: T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length];

// Pontos de Collector Score por tier (afinados na Fase 6; o brief traz um exemplo).
const COLLECTOR_POINTS: Record<Tier, number> = {
  COMUM: 18,
  TORCIDA: 45,
  RARO: 120,
  LENDARIO: 1500,
  GALACTICO: 5000,
};
// Preço de aquisição (centavos) usado ao semear Moments de exemplo.
const SEED_ACQUIRE_CENTS: Record<Tier, number> = {
  COMUM: 500,
  TORCIDA: 1500,
  RARO: 8000,
  LENDARIO: 50000,
  GALACTICO: 200000,
};

async function wipe() {
  // Ordem segura de FKs (filhos antes dos pais).
  await prisma.wishlist.deleteMany();
  await prisma.showcaseItem.deleteMany();
  await prisma.showcase.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.fastBreakLineup.deleteMany();
  await prisma.fastBreakDay.deleteMany();
  await prisma.momentUsage.deleteMany();
  await prisma.fastBreakRun.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.leaderboard.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.challengeEntry.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.fixture.deleteMany();
  await prisma.checkinNonce.deleteMany();
  await prisma.packListing.deleteMany();
  await prisma.packInventory.deleteMany();
  await prisma.moment.deleteMany();
  await prisma.pack.deleteMany();
  await prisma.drop.deleteMany();
  await prisma.template.deleteMany();
  await prisma.set.deleteMany();
  await prisma.series.deleteMany();
  await prisma.player.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.stadium.deleteMany();
}

async function main() {
  const seedMode = process.env.SEED_MODE;
  if (seedMode === 'if-empty') {
    const existing = await prisma.user.count();
    if (existing > 0) {
      console.log(`[seed] banco já populado (${existing} usuários) — pulando (SEED_MODE=if-empty).`);
      return;
    }
  }

  console.log('[seed] limpando dados anteriores…');
  await wipe();

  // ---------------------------------------------------------------- Temporada + Coleções
  const series = await prisma.series.create({
    data: {
      name: 'Temporada 1',
      season: '25/26',
      startsAt: days(-30),
      endsAt: days(300),
      status: 'PUBLICADO',
      publishAt: days(-30),
    },
  });

  const setDefs = [
    { name: 'Base', description: 'Coleção base da Temporada 1.' },
    { name: 'Estreias', description: 'Primeiros Lances de novos craques.' },
    { name: 'Golaços da Rodada', description: 'Os melhores gols de cada rodada.' },
  ];
  const sets = [];
  for (const s of setDefs) {
    sets.push(
      await prisma.set.create({
        data: { seriesId: series.id, name: s.name, description: s.description, status: 'PUBLICADO', publishAt: days(-30) },
      }),
    );
  }
  const baseSet = sets[0];

  // ---------------------------------------------------------------- Estádios + Times (A2)
  const stadiumDefs = [
    { name: 'Arena Vila Neon', city: 'São Paulo', lat: -23.5505, lng: -46.6333 },
    { name: 'Estádio Maré Alta', city: 'Santos', lat: -23.9608, lng: -46.3336 },
    { name: 'Arena Alto Andino', city: 'Curitiba', lat: -25.4284, lng: -49.2733 },
    { name: 'Estádio Miragem', city: 'Fortaleza', lat: -3.7319, lng: -38.5267 },
    { name: 'Arena Órbita', city: 'Brasília', lat: -15.7939, lng: -47.8828 },
    { name: 'Arena Dossel', city: 'Manaus', lat: -3.119, lng: -60.0217 },
  ];
  const stadiums = [];
  for (const st of stadiumDefs) {
    stadiums.push(await prisma.stadium.create({ data: { ...st, radiusMeters: 300 } }));
  }

  // 5 times publicados + 1 rascunho (Deserto Real) para demonstrar o ciclo de parceria (seção 10).
  const teamDefs = [
    { name: 'Serpentes FC', stadium: 0, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Litoral United', stadium: 1, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Cordilheira SC', stadium: 2, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Deserto Real', stadium: 3, partnerStatus: 'PROSPECT', status: 'RASCUNHO' },
    { name: 'Capital Cometas', stadium: 4, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Selva Jaguar', stadium: 5, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
  ];
  const teams = [];
  for (const t of teamDefs) {
    teams.push(
      await prisma.team.create({
        data: {
          name: t.name,
          homeStadiumId: stadiums[t.stadium].id,
          partnerStatus: t.partnerStatus,
          status: t.status,
          publishAt: t.status === 'PUBLICADO' ? days(-30) : null,
        },
      }),
    );
  }
  const publishedTeams = teams.filter((t) => t.status === 'PUBLICADO');

  // ---------------------------------------------------------------- Jogadores (fictícios)
  const playerNames = [
    'Téo Marreco', 'Juca Ferrão', 'Dinho Salgado', 'Vavá Contente', 'Ítalo Brenha',
    'Piá Landim', 'Zeca Torrão', 'Bóris Andrade', 'Nando Cavalo', 'Lipe Aurora',
    'Kadu Serrano', 'Wesley Maré', 'Gui Petrônio', 'Rai Falcão',
  ];
  const positions = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const nationalities = ['Verdelândia', 'Nortália', 'Sulméria', 'Atlantia', 'Montana do Sol'];
  const players = [];
  for (let i = 0; i < playerNames.length; i++) {
    players.push(
      await prisma.player.create({
        data: {
          name: playerNames[i],
          club: pick(publishedTeams, i).name,
          position: pick(positions, i),
          jersey: (i % 30) + 1,
          nationality: pick(nationalities, i),
        },
      }),
    );
  }

  // ---------------------------------------------------------------- Templates (~60, 5 tiers)
  const tierPlan: Tier[] = [
    ...Array(20).fill(Tier.COMUM),
    ...Array(18).fill(Tier.TORCIDA),
    ...Array(12).fill(Tier.RARO),
    ...Array(7).fill(Tier.LENDARIO),
    ...Array(3).fill(Tier.GALACTICO),
  ];
  const playTypes = ['GOL', 'DEFESA', 'DRIBLE', 'FALTA', 'ASSISTENCIA', 'DESARME'];
  const titlesByType: Record<string, string[]> = {
    GOL: ['Golaço de fora da área', 'Voleio no ângulo', 'Bicicleta improvável', 'Pintura de primeira'],
    DEFESA: ['Defesaça no reflexo', 'Milagre no ângulo', 'Pegada firme no pênalti'],
    DRIBLE: ['Drible desconcertante', 'Caneta na entrada da área', 'Corte e arranque'],
    FALTA: ['Falta no ângulo', 'Cobrança por cima da barreira'],
    ASSISTENCIA: ['Passe de letra decisivo', 'Lançamento milimétrico'],
    DESARME: ['Corte providencial', 'Desarme na última linha'],
  };
  const competitions = ['Liga Aurora', 'Copa das Marés', 'Supercopa Neon'];
  const trajectories = [
    'M10,90 Q50,10 90,40', 'M15,80 C30,20 70,20 90,60', 'M10,70 Q50,95 90,20',
    'M20,85 Q40,15 85,55', 'M12,60 C40,90 60,10 88,45',
  ];
  const parallelPlan = (i: number) => (i % 11 === 0 ? 'OURO' : i % 7 === 0 ? 'NOTURNO' : 'BASE');

  function editionFor(tier: Tier, i: number): { editionType: EditionType; editionSize: number | null } {
    switch (tier) {
      case Tier.COMUM:
        return i % 4 === 0
          ? { editionType: EditionType.LIMITADA, editionSize: 8000 + (i % 8) * 900 }
          : { editionType: EditionType.CIRCULANTE, editionSize: null };
      case Tier.TORCIDA:
        return { editionType: EditionType.LIMITADA, editionSize: 3000 + (i % 6) * 800 };
      case Tier.RARO:
        return { editionType: EditionType.LIMITADA, editionSize: 250 + (i % 6) * 80 };
      case Tier.LENDARIO:
        return { editionType: EditionType.LIMITADA, editionSize: 25 + (i % 7) * 10 };
      case Tier.GALACTICO:
        return { editionType: EditionType.LIMITADA, editionSize: 3 + (i % 3) * 2 };
    }
  }
  function badgesFor(tier: Tier, i: number): string[] {
    const b: string[] = [];
    if (i % 9 === 0) b.push('Estreia');
    if (tier === Tier.GALACTICO || tier === Tier.LENDARIO) b.push('Título');
    if (i % 13 === 0) b.push('Hat-trick');
    return b;
  }

  const templates = [];
  for (let i = 0; i < tierPlan.length; i++) {
    const tier = tierPlan[i];
    const type = pick(playTypes, i);
    const { editionType, editionSize } = editionFor(tier, i);
    const teamId = i % 6 === 5 ? null : pick(publishedTeams, i).id;
    templates.push(
      await prisma.template.create({
        data: {
          playerId: pick(players, i).id,
          seriesId: series.id,
          setId: pick(sets, i).id,
          teamId,
          title: pick(titlesByType[type], i),
          playType: type,
          competition: pick(competitions, i),
          matchDate: days(-25 + (i % 25)),
          videoUrl: null, // placeholder — a UI anima a trajetória (LEGAL.md)
          trajectory: pick(trajectories, i),
          tier,
          editionType,
          editionSize,
          badges: badgesFor(tier, i),
          parallel: parallelPlan(i),
          aspCents: Math.round(SEED_ACQUIRE_CENTS[tier] * 0.6),
          status: 'PUBLICADO',
          publishAt: days(-30),
        },
      }),
    );
  }
  const baseTemplates = templates.filter((t) => t.setId === baseSet.id);

  // ---------------------------------------------------------------- Drop + Pacotes
  const drop = await prisma.drop.create({
    data: {
      name: 'Drop de Estreia — Temporada 1',
      waitingRoomOpensAt: hours(-2),
      startsAt: hours(1), // sala de espera aberta; admin gera a fila ao iniciar
      endsAt: days(7),
      requiredCollectorScore: 100, // exige Score do Colecionador (colecionador tem ~6700)
      hasRebound: true,
      status: 'WAITING',
    },
  });

  const mainPack = await prisma.pack.create({
    data: {
      name: 'Pacote Estreia',
      dropId: drop.id,
      priceCents: 4000, // R$ 40
      momentCount: 3,
      oddsJson: { COMUM: 0.6, TORCIDA: 0.2, RARO: 0.15, LENDARIO: 0.045, GALACTICO: 0.005 },
      guaranteeTier: null,
      totalSupply: 5000,
      soldCount: 0,
      sealed: true,
      ticketOnly: false,
    },
  });

  const ticketPack = await prisma.pack.create({
    data: {
      name: 'Pacote de Troca — Lendário',
      priceCents: 0,
      momentCount: 3,
      oddsJson: { RARO: 0.7, LENDARIO: 0.25, GALACTICO: 0.05 },
      guaranteeTier: Tier.RARO,
      totalSupply: 500,
      sealed: true,
      ticketOnly: true, // trocável só por Fichas de Troca (regra 13)
    },
  });

  const checkinPack = await prisma.pack.create({
    data: {
      name: 'Pacote Prova de Presença',
      priceCents: 0,
      momentCount: 3,
      oddsJson: { COMUM: 0.7, TORCIDA: 0.2, RARO: 0.09, LENDARIO: 0.01 },
      guaranteeTier: null,
      totalSupply: 100000,
      sealed: false,
      ticketOnly: false,
    },
  });

  // Drop Relâmpago (LIVE, rebound) — demonstra a compra por rebound (janela já passada).
  const reboundDrop = await prisma.drop.create({
    data: {
      name: 'Drop Relâmpago',
      waitingRoomOpensAt: hours(-3),
      startsAt: hours(-2),
      endsAt: days(3),
      requiredCollectorScore: 0,
      hasRebound: true,
      status: 'LIVE',
    },
  });
  const reboundPack = await prisma.pack.create({
    data: {
      name: 'Pacote Relâmpago',
      dropId: reboundDrop.id,
      priceCents: 2500,
      momentCount: 3,
      oddsJson: { COMUM: 0.55, TORCIDA: 0.25, RARO: 0.15, LENDARIO: 0.045, GALACTICO: 0.005 },
      totalSupply: 2000,
      sealed: true,
    },
  });

  // ---------------------------------------------------------------- Fixtures (A2.5)
  const [serpentes, litoral, cordilheira, , cometas] = teams;
  // 1 jogo AO VIVO agora (janela aberta) — fluxo feliz de check-in.
  await prisma.fixture.create({
    data: {
      homeTeamId: serpentes.id,
      awayTeamId: litoral.id,
      stadiumId: serpentes.homeStadiumId!,
      kickoffAt: mins(-30),
      status: 'LIVE',
      checkinOpensAt: hours(-2),
      checkinClosesAt: hours(3),
      rewardPackId: checkinPack.id,
    },
  });
  await prisma.fixture.create({
    data: {
      homeTeamId: cordilheira.id,
      awayTeamId: cometas.id,
      stadiumId: cordilheira.homeStadiumId!,
      kickoffAt: days(2),
      status: 'SCHEDULED',
      checkinOpensAt: new Date(days(2).getTime() - 2 * 3_600_000),
      checkinClosesAt: new Date(days(2).getTime() + 3 * 3_600_000),
      rewardPackId: checkinPack.id,
    },
  });
  await prisma.fixture.create({
    data: {
      homeTeamId: cometas.id,
      awayTeamId: serpentes.id,
      stadiumId: cometas.homeStadiumId!,
      kickoffAt: days(5),
      status: 'SCHEDULED',
      checkinOpensAt: new Date(days(5).getTime() - 2 * 3_600_000),
      checkinClosesAt: new Date(days(5).getTime() + 3 * 3_600_000),
      rewardPackId: checkinPack.id,
    },
  });

  // ---------------------------------------------------------------- Missão (desafios são criados após os Moments do colecionador)
  await prisma.quest.create({
    data: {
      name: 'Volta ao Mundo',
      description: 'Monte uma Vitrine com Lances de 3 competições diferentes.',
      criteriaJson: { type: 'showcase_competitions', count: 3 },
      rewardTemplateId: baseTemplates[0]?.id ?? null,
      startsAt: days(-1),
      endsAt: days(60),
    },
  });

  // ---------------------------------------------------------------- Rankings + Checklist
  await prisma.leaderboard.create({
    data: { kind: 'TEAM', refKey: serpentes.name, name: `Ranking ${serpentes.name}`, rewardsJson: { top1: 'Pacote Lendário' } },
  });
  await prisma.leaderboard.create({
    data: { kind: 'PLAYER', refKey: players[0].id, name: `Ranking ${players[0].name}`, rewardsJson: { top1: 'Pacote Lendário' } },
  });
  await prisma.checklist.create({
    data: {
      name: 'Checklist Base — Temporada 1',
      kind: 'SET',
      requiredTemplateIds: baseTemplates.slice(0, 5).map((t) => t.id),
      bonusPoints: 500,
    },
  });

  // ---------------------------------------------------------------- Fast Break (Pelada, 7 dias)
  const run = await prisma.fastBreakRun.create({
    data: { name: 'Pelada Temporada 1 — Semana 1', startsAt: days(-1), endsAt: days(6), lineupSize: 5, survivor: false },
  });
  const statKeys = ['gols', 'assistencias', 'defesas', 'desarmes', 'notas', 'gols', 'assistencias'];
  for (let d = 0; d < 7; d++) {
    await prisma.fastBreakDay.create({
      data: { runId: run.id, dayNumber: d + 1, gameDate: days(-1 + d), statKey: statKeys[d], targetScore: 20 + d * 3 },
    });
  }

  // ---------------------------------------------------------------- Usuários
  const passwordHash = bcrypt.hashSync('wefans123', 10);
  const admin = await prisma.user.create({
    data: { email: 'admin@wefans.test', username: 'admin', passwordHash, isAdmin: true, balanceCents: 1_000_000 },
  });
  const collector = await prisma.user.create({
    data: {
      email: 'colecionador@wefans.test',
      username: 'colecionador',
      passwordHash,
      balanceCents: 50_000,
      favoriteTeamId: serpentes.id, // segue o time do jogo ao vivo (check-in demo)
    },
  });

  // ---------------------------------------------------------------- Moments de exemplo (mint direto)
  // Na Fase 2, isto passa pelo serviço `mint`; aqui é criação direta para popular a coleção.
  const seedTemplates = [
    templates.find((t) => t.tier === Tier.COMUM)!,
    templates.find((t) => t.tier === Tier.COMUM && t.parallel === 'NOTURNO') ?? templates.filter((t) => t.tier === Tier.COMUM)[1],
    templates.find((t) => t.tier === Tier.TORCIDA)!,
    templates.find((t) => t.tier === Tier.RARO)!,
    templates.find((t) => t.tier === Tier.LENDARIO)!,
    templates.find((t) => t.tier === Tier.GALACTICO)!,
  ];
  const ownedMoments = [];
  let topShotScore = 0;
  let collectorScore = 0;
  for (const tpl of seedTemplates) {
    const acquired = SEED_ACQUIRE_CENTS[tpl.tier];
    const score = Math.round((acquired / 100) * 10);
    const updated = await prisma.template.update({
      where: { id: tpl.id },
      data: { mintedCount: { increment: 1 }, circulatingCount: { increment: 1 } },
    });
    const moment = await prisma.moment.create({
      data: {
        templateId: tpl.id,
        serial: updated.mintedCount,
        ownerId: collector.id,
        parallel: tpl.parallel,
        acquiredPriceCents: acquired,
        topShotScore: score,
        mintedAt: now,
      },
    });
    await prisma.transaction.create({
      data: { type: TxType.MINT, momentId: moment.id, buyerId: collector.id, amountCents: acquired, feeCents: 0 },
    });
    ownedMoments.push(moment);
    topShotScore += score;
    collectorScore += COLLECTOR_POINTS[tpl.tier];
  }
  await prisma.user.update({ where: { id: collector.id }, data: { topShotScore, collectorScore } });

  // ---------------------------------------------------------------- Desafios (Fase 5) — alinhados à coleção do colecionador
  await prisma.challenge.create({
    data: {
      type: ChallengeType.STANDARD,
      name: 'Colecione a Base',
      description: 'Tenha os Lances indicados na coleção para ganhar um pacote de troca.',
      startsAt: days(-1),
      endsAt: days(30),
      requiredTemplateIds: [seedTemplates[2].id, seedTemplates[3].id],
      rewardPackId: ticketPack.id,
      burnOnComplete: false,
    },
  });
  await prisma.challenge.create({
    data: {
      type: ChallengeType.CRAFTING,
      name: 'Forja do Galáctico',
      description: 'Submeta (e queime) o Lance exigido no Montador em troca de um Lance Galáctico.',
      startsAt: days(-1),
      endsAt: days(45),
      requiredTemplateIds: [seedTemplates[0].id],
      rewardTemplateId: templates.find((t) => t.tier === Tier.GALACTICO)?.id ?? null,
      burnOnComplete: true,
    },
  });

  // ---------------------------------------------------------------- Wishlist + Vitrine
  const ownedTemplateIds = new Set(seedTemplates.map((t) => t.id));
  const wishTemplates = templates.filter((t) => !ownedTemplateIds.has(t.id)).slice(0, 3);
  for (const t of wishTemplates) {
    await prisma.wishlist.create({ data: { userId: collector.id, templateId: t.id } });
  }
  const showcase = await prisma.showcase.create({
    data: { ownerId: collector.id, name: 'Minha Vitrine', description: 'Meus Lances favoritos da Temporada 1.', public: true },
  });
  for (let i = 0; i < Math.min(3, ownedMoments.length); i++) {
    await prisma.showcaseItem.create({ data: { showcaseId: showcase.id, momentId: ownedMoments[i].id, order: i } });
  }

  // ---------------------------------------------------------------- Mercado semeado (Fase 4)
  // O admin também coleciona, para haver contrapartes e movimento no mercado.
  const adminSeedTemplates = [
    templates.filter((t) => t.tier === Tier.COMUM)[2],
    templates.filter((t) => t.tier === Tier.TORCIDA)[1],
    templates.filter((t) => t.tier === Tier.RARO)[1],
    templates.filter((t) => t.tier === Tier.LENDARIO)[1],
  ].filter(Boolean);
  const adminMoments: { moment: { id: string; templateId: string }; tpl: (typeof templates)[number] }[] = [];
  let adminScore = 0;
  let adminCollector = 0;
  for (const tpl of adminSeedTemplates) {
    const acquired = SEED_ACQUIRE_CENTS[tpl.tier];
    const score = Math.round((acquired / 100) * 10);
    const updated = await prisma.template.update({
      where: { id: tpl.id },
      data: { mintedCount: { increment: 1 }, circulatingCount: { increment: 1 } },
    });
    const moment = await prisma.moment.create({
      data: { templateId: tpl.id, serial: updated.mintedCount, ownerId: admin.id, parallel: tpl.parallel, acquiredPriceCents: acquired, topShotScore: score, mintedAt: now },
    });
    await prisma.transaction.create({ data: { type: TxType.MINT, momentId: moment.id, buyerId: admin.id, amountCents: acquired } });
    adminMoments.push({ moment, tpl });
    adminScore += score;
    adminCollector += COLLECTOR_POINTS[tpl.tier];
  }
  await prisma.user.update({ where: { id: admin.id }, data: { topShotScore: adminScore, collectorScore: adminCollector } });

  const templateById = new Map(templates.map((t) => [t.id, t]));

  // Anúncios ativos: 3 do colecionador + 2 do admin.
  const toList = [
    ...ownedMoments.slice(0, 3).map((m) => ({ momentId: m.id, templateId: m.templateId, sellerId: collector.id })),
    ...adminMoments.slice(0, 2).map(({ moment }) => ({ momentId: moment.id, templateId: moment.templateId, sellerId: admin.id })),
  ];
  for (const l of toList) {
    const asp = templateById.get(l.templateId)?.aspCents ?? 500;
    await prisma.listing.create({ data: { momentId: l.momentId, sellerId: l.sellerId, priceCents: Math.max(200, asp * 2), status: 'ACTIVE' } });
  }

  // Vendas históricas (feed ao vivo + ASP): admin comprou do colecionador e vice-versa.
  const salePairs = [
    ...adminMoments.map(({ moment, tpl }) => ({ momentId: moment.id, tpl, buyerId: admin.id, sellerId: collector.id })),
    { momentId: ownedMoments[3].id, tpl: templateById.get(ownedMoments[3].templateId)!, buyerId: collector.id, sellerId: admin.id },
  ];
  let s = 0;
  for (const sale of salePairs) {
    const amount = Math.round(SEED_ACQUIRE_CENTS[sale.tpl.tier] * 1.5);
    await prisma.transaction.create({
      data: { type: TxType.BUY, momentId: sale.momentId, buyerId: sale.buyerId, sellerId: sale.sellerId, amountCents: amount, feeCents: Math.round(amount * 0.05), createdAt: new Date(now.getTime() - s * 37 * 60_000) },
    });
    await prisma.template.update({ where: { id: sale.tpl.id }, data: { aspCents: amount } });
    s++;
  }

  // Fila do Drop Relâmpago com janela já passada → rebound liberado para o colecionador.
  await prisma.queueEntry.create({
    data: { dropId: reboundDrop.id, userId: collector.id, position: 3, windowStartsAt: hours(-1), purchased: false },
  });
  // Mercado de Pacotes: admin lista 2 pacotes lacrados.
  for (let i = 0; i < 2; i++) {
    const inv = await prisma.packInventory.create({ data: { packId: mainPack.id, ownerId: admin.id } });
    await prisma.packListing.create({ data: { packInventoryId: inv.id, sellerId: admin.id, priceCents: 4500 + i * 500, status: 'ACTIVE' } });
  }

  console.log('[seed] pronto:');
  console.table({
    listings: toList.length,
    vendas: salePairs.length,
    series: 1,
    sets: sets.length,
    stadiums: stadiums.length,
    teams: teams.length,
    players: players.length,
    templates: templates.length,
    packs: 3,
    fixtures: 3,
    moments: ownedMoments.length,
    users: 2,
  });
  console.log('[seed] logins de teste — admin@wefans.test / colecionador@wefans.test (senha: wefans123)');
}

main()
  .catch((e) => {
    console.error('[seed] erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
