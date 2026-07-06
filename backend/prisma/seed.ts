import 'dotenv/config';
import { PrismaClient, Tier, EditionType, ChallengeType, TxType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Dados REAIS de clubes/jogadores para desenvolvimento — sem afiliação oficial;
// licenciamento será tratado antes de qualquer lançamento (ver .claude/LEGAL.md).
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
  await prisma.feedReaction.deleteMany();
  await prisma.chatMessage.deleteMany();
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
  await prisma.leaderboardLock.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.leaderboard.deleteMany();
  await prisma.checklistClaim.deleteMany();
  await prisma.questClaim.deleteMany();
  await prisma.auditLog.deleteMany();
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
      name: 'Brasileirão 2025',
      season: '2025',
      startsAt: days(-30),
      endsAt: days(300),
      status: 'PUBLICADO',
      publishAt: days(-30),
    },
  });

  const setDefs = [
    { name: 'Base', description: 'Coleção base do Brasileirão 2025.' },
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
    { name: 'Maracanã', city: 'Rio de Janeiro', lat: -22.9122, lng: -43.2302 }, // 0 Fla/Flu
    { name: 'Allianz Parque', city: 'São Paulo', lat: -23.5273, lng: -46.6786 }, // 1
    { name: 'Neo Química Arena', city: 'São Paulo', lat: -23.5453, lng: -46.4742 }, // 2
    { name: 'Arena MRV', city: 'Belo Horizonte', lat: -19.9761, lng: -44.0004 }, // 3
    { name: 'Estádio Nilton Santos', city: 'Rio de Janeiro', lat: -22.8933, lng: -43.2919 }, // 4
    { name: 'Vila Belmiro', city: 'Santos', lat: -23.9519, lng: -46.3383 }, // 5
    { name: 'Mineirão', city: 'Belo Horizonte', lat: -19.8659, lng: -43.9709 }, // 6
    { name: 'MorumBIS', city: 'São Paulo', lat: -23.6002, lng: -46.7199 }, // 7
    { name: 'São Januário', city: 'Rio de Janeiro', lat: -22.8905, lng: -43.229 }, // 8
    { name: 'Arena do Grêmio', city: 'Porto Alegre', lat: -29.9711, lng: -51.1953 }, // 9
    { name: 'Beira-Rio', city: 'Porto Alegre', lat: -30.0654, lng: -51.2358 }, // 10
    { name: 'Arena Fonte Nova', city: 'Salvador', lat: -12.9789, lng: -38.5044 }, // 11
    { name: 'Castelão', city: 'Fortaleza', lat: -3.8073, lng: -38.5224 }, // 12 For/Cea
    { name: 'Ilha do Retiro', city: 'Recife', lat: -8.0631, lng: -34.9044 }, // 13
    { name: 'Barradão', city: 'Salvador', lat: -12.9928, lng: -38.4653 }, // 14
    { name: 'Alfredo Jaconi', city: 'Caxias do Sul', lat: -29.1634, lng: -51.193 }, // 15
    { name: 'Estádio Maião', city: 'Mirassol', lat: -20.8193, lng: -49.5217 }, // 16
    { name: 'Nabi Abi Chedid', city: 'Bragança Paulista', lat: -22.9527, lng: -46.5419 }, // 17
  ];
  const stadiums = [];
  for (const st of stadiumDefs) {
    stadiums.push(await prisma.stadium.create({ data: { ...st, radiusMeters: 300 } }));
  }

  // Série A 2025 completa — 20 clubes, todos publicados.
  const teamDefs = [
    { name: 'Flamengo', stadium: 0, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Palmeiras', stadium: 1, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Corinthians', stadium: 2, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Atlético-MG', stadium: 3, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Botafogo', stadium: 4, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Santos', stadium: 5, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Cruzeiro', stadium: 6, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'São Paulo', stadium: 7, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Fluminense', stadium: 0, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Vasco da Gama', stadium: 8, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Grêmio', stadium: 9, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Internacional', stadium: 10, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Bahia', stadium: 11, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Fortaleza', stadium: 12, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Ceará', stadium: 12, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Sport', stadium: 13, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Vitória', stadium: 14, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Juventude', stadium: 15, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Mirassol', stadium: 16, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
    { name: 'Red Bull Bragantino', stadium: 17, partnerStatus: 'ATIVO', status: 'PUBLICADO' },
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

  // ---------------------------------------------------------------- Jogadores (reais — dev; licenciamento depois)
  // 5 jogadores reais por clube — Série A 2025 (100 no total)
  const playerDefs = [
    // Flamengo
    { name: 'Arrascaeta', club: 'Flamengo', position: 'MEI', jersey: 14, nationality: 'Uruguai' },
    { name: 'Pedro', club: 'Flamengo', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Bruno Henrique', club: 'Flamengo', position: 'ATA', jersey: 27, nationality: 'Brasil' },
    { name: 'Léo Ortiz', club: 'Flamengo', position: 'ZAG', jersey: 3, nationality: 'Brasil' },
    { name: 'Rossi', club: 'Flamengo', position: 'GOL', jersey: 1, nationality: 'Argentina' },
    // Palmeiras
    { name: 'Raphael Veiga', club: 'Palmeiras', position: 'MEI', jersey: 23, nationality: 'Brasil' },
    { name: 'Flaco López', club: 'Palmeiras', position: 'ATA', jersey: 42, nationality: 'Argentina' },
    { name: 'Vitor Roque', club: 'Palmeiras', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Gustavo Gómez', club: 'Palmeiras', position: 'ZAG', jersey: 15, nationality: 'Paraguai' },
    { name: 'Weverton', club: 'Palmeiras', position: 'GOL', jersey: 21, nationality: 'Brasil' },
    // Corinthians
    { name: 'Memphis Depay', club: 'Corinthians', position: 'ATA', jersey: 94, nationality: 'Holanda' },
    { name: 'Yuri Alberto', club: 'Corinthians', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Rodrigo Garro', club: 'Corinthians', position: 'MEI', jersey: 8, nationality: 'Argentina' },
    { name: 'André Ramalho', club: 'Corinthians', position: 'ZAG', jersey: 4, nationality: 'Brasil' },
    { name: 'Hugo Souza', club: 'Corinthians', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Atlético-MG
    { name: 'Hulk', club: 'Atlético-MG', position: 'ATA', jersey: 7, nationality: 'Brasil' },
    { name: 'Gustavo Scarpa', club: 'Atlético-MG', position: 'MEI', jersey: 6, nationality: 'Brasil' },
    { name: 'Rony', club: 'Atlético-MG', position: 'ATA', jersey: 11, nationality: 'Brasil' },
    { name: 'Junior Alonso', club: 'Atlético-MG', position: 'ZAG', jersey: 4, nationality: 'Paraguai' },
    { name: 'Everson', club: 'Atlético-MG', position: 'GOL', jersey: 22, nationality: 'Brasil' },
    // Botafogo
    { name: 'Savarino', club: 'Botafogo', position: 'MEI', jersey: 10, nationality: 'Venezuela' },
    { name: 'Artur', club: 'Botafogo', position: 'ATA', jersey: 7, nationality: 'Brasil' },
    { name: 'Marlon Freitas', club: 'Botafogo', position: 'VOL', jersey: 17, nationality: 'Brasil' },
    { name: 'Alex Telles', club: 'Botafogo', position: 'LAT', jersey: 13, nationality: 'Brasil' },
    { name: 'John', club: 'Botafogo', position: 'GOL', jersey: 12, nationality: 'Brasil' },
    // Santos
    { name: 'Neymar Jr', club: 'Santos', position: 'ATA', jersey: 10, nationality: 'Brasil' },
    { name: 'Guilherme', club: 'Santos', position: 'ATA', jersey: 11, nationality: 'Brasil' },
    { name: 'Tiquinho Soares', club: 'Santos', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Zé Rafael', club: 'Santos', position: 'VOL', jersey: 6, nationality: 'Brasil' },
    { name: 'Gabriel Brazão', club: 'Santos', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Cruzeiro
    { name: 'Gabigol', club: 'Cruzeiro', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Matheus Pereira', club: 'Cruzeiro', position: 'MEI', jersey: 10, nationality: 'Brasil' },
    { name: 'Kaio Jorge', club: 'Cruzeiro', position: 'ATA', jersey: 19, nationality: 'Brasil' },
    { name: 'Fabrício Bruno', club: 'Cruzeiro', position: 'ZAG', jersey: 26, nationality: 'Brasil' },
    { name: 'Cássio', club: 'Cruzeiro', position: 'GOL', jersey: 12, nationality: 'Brasil' },
    // São Paulo
    { name: 'Oscar', club: 'São Paulo', position: 'MEI', jersey: 8, nationality: 'Brasil' },
    { name: 'Lucas Moura', club: 'São Paulo', position: 'MEI', jersey: 7, nationality: 'Brasil' },
    { name: 'Calleri', club: 'São Paulo', position: 'ATA', jersey: 9, nationality: 'Argentina' },
    { name: 'Arboleda', club: 'São Paulo', position: 'ZAG', jersey: 5, nationality: 'Equador' },
    { name: 'Rafael', club: 'São Paulo', position: 'GOL', jersey: 23, nationality: 'Brasil' },
    // Fluminense
    { name: 'Germán Cano', club: 'Fluminense', position: 'ATA', jersey: 14, nationality: 'Argentina' },
    { name: 'Paulo Henrique Ganso', club: 'Fluminense', position: 'MEI', jersey: 10, nationality: 'Brasil' },
    { name: 'Everaldo', club: 'Fluminense', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Thiago Silva', club: 'Fluminense', position: 'ZAG', jersey: 3, nationality: 'Brasil' },
    { name: 'Fábio', club: 'Fluminense', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Vasco da Gama
    { name: 'Philippe Coutinho', club: 'Vasco da Gama', position: 'MEI', jersey: 11, nationality: 'Brasil' },
    { name: 'Vegetti', club: 'Vasco da Gama', position: 'ATA', jersey: 99, nationality: 'Argentina' },
    { name: 'Rayan', club: 'Vasco da Gama', position: 'ATA', jersey: 77, nationality: 'Brasil' },
    { name: 'Hugo Moura', club: 'Vasco da Gama', position: 'VOL', jersey: 5, nationality: 'Brasil' },
    { name: 'Léo Jardim', club: 'Vasco da Gama', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Grêmio
    { name: 'Braithwaite', club: 'Grêmio', position: 'ATA', jersey: 22, nationality: 'Dinamarca' },
    { name: 'Cristaldo', club: 'Grêmio', position: 'MEI', jersey: 10, nationality: 'Argentina' },
    { name: 'Villasanti', club: 'Grêmio', position: 'VOL', jersey: 20, nationality: 'Paraguai' },
    { name: 'Kannemann', club: 'Grêmio', position: 'ZAG', jersey: 4, nationality: 'Argentina' },
    { name: 'Tiago Volpi', club: 'Grêmio', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Internacional
    { name: 'Alan Patrick', club: 'Internacional', position: 'MEI', jersey: 10, nationality: 'Brasil' },
    { name: 'Rafael Borré', club: 'Internacional', position: 'ATA', jersey: 19, nationality: 'Colômbia' },
    { name: 'Carbonero', club: 'Internacional', position: 'ATA', jersey: 7, nationality: 'Colômbia' },
    { name: 'Vitão', club: 'Internacional', position: 'ZAG', jersey: 4, nationality: 'Brasil' },
    { name: 'Rochet', club: 'Internacional', position: 'GOL', jersey: 1, nationality: 'Uruguai' },
    // Bahia
    { name: 'Everton Ribeiro', club: 'Bahia', position: 'MEI', jersey: 10, nationality: 'Brasil' },
    { name: 'Cauly', club: 'Bahia', position: 'MEI', jersey: 8, nationality: 'Brasil' },
    { name: 'Luciano Juba', club: 'Bahia', position: 'LAT', jersey: 46, nationality: 'Brasil' },
    { name: 'Kanu', club: 'Bahia', position: 'ZAG', jersey: 4, nationality: 'Brasil' },
    { name: 'Marcos Felipe', club: 'Bahia', position: 'GOL', jersey: 22, nationality: 'Brasil' },
    // Fortaleza
    { name: 'Lucero', club: 'Fortaleza', position: 'ATA', jersey: 9, nationality: 'Argentina' },
    { name: 'Pochettino', club: 'Fortaleza', position: 'MEI', jersey: 7, nationality: 'Argentina' },
    { name: 'Breno Lopes', club: 'Fortaleza', position: 'ATA', jersey: 19, nationality: 'Brasil' },
    { name: 'Tinga', club: 'Fortaleza', position: 'LAT', jersey: 2, nationality: 'Brasil' },
    { name: 'João Ricardo', club: 'Fortaleza', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Ceará
    { name: 'Pedro Raul', club: 'Ceará', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Lucas Mugni', club: 'Ceará', position: 'MEI', jersey: 10, nationality: 'Argentina' },
    { name: 'Richardson', club: 'Ceará', position: 'VOL', jersey: 88, nationality: 'Brasil' },
    { name: 'Matheus Bahia', club: 'Ceará', position: 'LAT', jersey: 6, nationality: 'Brasil' },
    { name: 'Bruno Ferreira', club: 'Ceará', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Sport
    { name: 'Lucas Lima', club: 'Sport', position: 'MEI', jersey: 10, nationality: 'Brasil' },
    { name: 'Barletta', club: 'Sport', position: 'ATA', jersey: 11, nationality: 'Brasil' },
    { name: 'Du Queiroz', club: 'Sport', position: 'VOL', jersey: 5, nationality: 'Brasil' },
    { name: 'Rafael Thyere', club: 'Sport', position: 'ZAG', jersey: 3, nationality: 'Brasil' },
    { name: 'Caíque França', club: 'Sport', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Vitória
    { name: 'Janderson', club: 'Vitória', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Matheuzinho', club: 'Vitória', position: 'MEI', jersey: 10, nationality: 'Brasil' },
    { name: 'Lucas Halter', club: 'Vitória', position: 'ZAG', jersey: 4, nationality: 'Brasil' },
    { name: 'Willian Oliveira', club: 'Vitória', position: 'VOL', jersey: 5, nationality: 'Brasil' },
    { name: 'Lucas Arcanjo', club: 'Vitória', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Juventude
    { name: 'Gabriel Taliari', club: 'Juventude', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Mandaca', club: 'Juventude', position: 'MEI', jersey: 10, nationality: 'Brasil' },
    { name: 'Jadson', club: 'Juventude', position: 'VOL', jersey: 8, nationality: 'Brasil' },
    { name: 'Wilker Ángel', club: 'Juventude', position: 'ZAG', jersey: 3, nationality: 'Venezuela' },
    { name: 'Gustavo', club: 'Juventude', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Mirassol
    { name: 'Reinaldo', club: 'Mirassol', position: 'LAT', jersey: 6, nationality: 'Brasil' },
    { name: 'Danielzinho', club: 'Mirassol', position: 'MEI', jersey: 10, nationality: 'Brasil' },
    { name: 'Negueba', club: 'Mirassol', position: 'ATA', jersey: 11, nationality: 'Brasil' },
    { name: 'Edson Carioca', club: 'Mirassol', position: 'ATA', jersey: 18, nationality: 'Brasil' },
    { name: 'Walter', club: 'Mirassol', position: 'GOL', jersey: 1, nationality: 'Brasil' },
    // Red Bull Bragantino
    { name: 'Eduardo Sasha', club: 'Red Bull Bragantino', position: 'ATA', jersey: 9, nationality: 'Brasil' },
    { name: 'Jhon Jhon', club: 'Red Bull Bragantino', position: 'MEI', jersey: 8, nationality: 'Brasil' },
    { name: 'Eric Ramires', club: 'Red Bull Bragantino', position: 'VOL', jersey: 5, nationality: 'Brasil' },
    { name: 'Pedro Henrique', club: 'Red Bull Bragantino', position: 'ZAG', jersey: 4, nationality: 'Brasil' },
    { name: 'Cleiton', club: 'Red Bull Bragantino', position: 'GOL', jersey: 1, nationality: 'Brasil' },
  ];
  const players = [];
  for (const def of playerDefs) {
    players.push(await prisma.player.create({ data: def }));
  }

  // ---------------------------------------------------------------- Templates (~60, 5 tiers)
  const tierPlan: Tier[] = [
    ...Array(40).fill(Tier.COMUM),
    ...Array(36).fill(Tier.TORCIDA),
    ...Array(24).fill(Tier.RARO),
    ...Array(14).fill(Tier.LENDARIO),
    ...Array(6).fill(Tier.GALACTICO),
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
  const competitions = ['Brasileirão Série A', 'Copa do Brasil', 'Libertadores'];
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
    const tplPlayer = pick(players, i);
    const teamId = i % 6 === 5 ? null : (publishedTeams.find((t) => t.name === tplPlayer.club)?.id ?? null);
    templates.push(
      await prisma.template.create({
        data: {
          playerId: tplPlayer.id,
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
      name: 'Kickoff Drop — Brasileirão 2025',
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
      name: 'Rookie Pack',
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
      name: 'Pack das Fichas — Lendário',
      priceCents: 0,
      momentCount: 3,
      oddsJson: { RARO: 0.7, LENDARIO: 0.25, GALACTICO: 0.05 },
      guaranteeTier: Tier.RARO,
      totalSupply: 500,
      sealed: true,
      ticketOnly: true, // trocável só por Fichas de Troca (regra 13)
    },
  });

  // Rip Pack 24/7 — sempre à venda, sem fila (faixa "Rip Packs" da página de drops)
  await prisma.pack.create({
    data: {
      name: 'Pack da Rodada 24/7',
      priceCents: 2000,
      momentCount: 3,
      oddsJson: { COMUM: 0.62, TORCIDA: 0.25, RARO: 0.11, LENDARIO: 0.019, GALACTICO: 0.001 },
      guaranteeTier: null,
      totalSupply: 10000,
      sealed: false,
      ticketOnly: false,
    },
  });

  const checkinPack = await prisma.pack.create({
    data: {
      name: 'Pack Prova de Presença',
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
      name: 'Flash Drop',
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
      name: 'Flash Pack',
      dropId: reboundDrop.id,
      priceCents: 2500,
      momentCount: 3,
      oddsJson: { COMUM: 0.55, TORCIDA: 0.25, RARO: 0.15, LENDARIO: 0.045, GALACTICO: 0.005 },
      totalSupply: 2000,
      sealed: true,
    },
  });

  // ---------------------------------------------------------------- Fixtures (A2.5)
  const byName = (n: string) => teams.find((t) => t.name === n)!;
  const flamengo = byName('Flamengo');
  const palmeiras = byName('Palmeiras');
  const corinthians = byName('Corinthians');
  const botafogo = byName('Botafogo');
  // 1 jogo AO VIVO agora (janela aberta) — fluxo feliz de check-in.
  await prisma.fixture.create({
    data: {
      homeTeamId: flamengo.id,
      awayTeamId: palmeiras.id,
      stadiumId: flamengo.homeStadiumId!,
      kickoffAt: mins(-30),
      status: 'LIVE',
      checkinOpensAt: hours(-2),
      checkinClosesAt: hours(3),
      rewardPackId: checkinPack.id,
    },
  });
  await prisma.fixture.create({
    data: {
      homeTeamId: corinthians.id,
      awayTeamId: botafogo.id,
      stadiumId: corinthians.homeStadiumId!,
      kickoffAt: days(2),
      status: 'SCHEDULED',
      checkinOpensAt: new Date(days(2).getTime() - 2 * 3_600_000),
      checkinClosesAt: new Date(days(2).getTime() + 3 * 3_600_000),
      rewardPackId: checkinPack.id,
    },
  });
  await prisma.fixture.create({
    data: {
      homeTeamId: botafogo.id,
      awayTeamId: flamengo.id,
      stadiumId: botafogo.homeStadiumId!,
      kickoffAt: days(5),
      status: 'SCHEDULED',
      checkinOpensAt: new Date(days(5).getTime() - 2 * 3_600_000),
      checkinClosesAt: new Date(days(5).getTime() + 3 * 3_600_000),
      rewardPackId: checkinPack.id,
    },
  });

  // mais dois clássicos agendados (Série A cheia)
  await prisma.fixture.create({
    data: {
      homeTeamId: byName('Cruzeiro').id,
      awayTeamId: byName('Atlético-MG').id,
      stadiumId: byName('Cruzeiro').homeStadiumId!,
      kickoffAt: days(3),
      status: 'SCHEDULED',
      checkinOpensAt: new Date(days(3).getTime() - 2 * 3_600_000),
      checkinClosesAt: new Date(days(3).getTime() + 3 * 3_600_000),
      rewardPackId: checkinPack.id,
    },
  });
  await prisma.fixture.create({
    data: {
      homeTeamId: byName('São Paulo').id,
      awayTeamId: byName('Santos').id,
      stadiumId: byName('São Paulo').homeStadiumId!,
      kickoffAt: days(4),
      status: 'SCHEDULED',
      checkinOpensAt: new Date(days(4).getTime() - 2 * 3_600_000),
      checkinClosesAt: new Date(days(4).getTime() + 3 * 3_600_000),
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
    data: {
      kind: 'TEAM',
      refKey: flamengo.name,
      name: `Ranking ${flamengo.name}`,
      rewardsJson: { top1: 'Pacote de Troca — Lendário', top1PackId: ticketPack.id },
    },
  });
  await prisma.leaderboard.create({
    data: {
      kind: 'PLAYER',
      refKey: players[0].id,
      name: `Ranking ${players[0].name}`,
      rewardsJson: { top1: 'Pacote de Troca — Lendário', top1PackId: ticketPack.id },
    },
  });
  // (checklist é criado após os Moments do colecionador, alinhado à coleção dele)

  // ---------------------------------------------------------------- Fast Break (Matchday, 7 dias)
  const run = await prisma.fastBreakRun.create({
    data: {
      name: 'Matchday Brasileirão — Semana 1',
      startsAt: days(-1),
      endsAt: days(6),
      lineupSize: 5,
      survivor: false,
      rewardPackId: checkinPack.id, // marco de 3 vitórias → pacote
    },
  });
  // alvo compatível com a stat (5 jogadores; captain 2×): gols ~0.7/j, defesas ~3/j, nota ~7.5/j
  const dayPlan: { stat: string; target: number }[] = [
    { stat: 'gols', target: 4 },
    { stat: 'assistencias', target: 4 },
    { stat: 'defesas', target: 15 },
    { stat: 'desarmes', target: 12 },
    { stat: 'nota', target: 38 },
    { stat: 'gols', target: 5 },
    { stat: 'assistencias', target: 5 },
  ];
  for (let d = 0; d < dayPlan.length; d++) {
    await prisma.fastBreakDay.create({
      data: { runId: run.id, dayNumber: d + 1, gameDate: days(-1 + d), statKey: dayPlan[d].stat, targetScore: dayPlan[d].target },
    });
  }
  // Mata-mata (survivor): quem perde está fora. Alvos altíssimos = eliminação demonstrável.
  const survivorRun = await prisma.fastBreakRun.create({
    data: { name: 'Mata-mata Relâmpago', startsAt: days(-1), endsAt: days(2), lineupSize: 5, survivor: true },
  });
  for (let d = 0; d < 2; d++) {
    await prisma.fastBreakDay.create({
      data: { runId: survivorRun.id, dayNumber: d + 1, gameDate: days(-1 + d), statKey: 'gols', targetScore: 999 },
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
      favoriteTeamId: flamengo.id, // segue o time do jogo ao vivo (check-in demo)
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
    templates.find((t) => t.competition === 'Copa do Brasil')!, // garante 3 competições p/ a Missão
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
      name: 'Feche o Álbum da Base',
      description: 'Junte no seu álbum os Lances pedidos da coleção Base e leve um pacote de troca.',
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
      name: 'Bate-Troca do Galáctico',
      description: 'Dê o Lance pedido na troca (ele é queimado) e leve um Galáctico pra casa — figurinha rara não se acha, se troca.',
      startsAt: days(-1),
      endsAt: days(45),
      requiredTemplateIds: [seedTemplates[0].id],
      rewardTemplateId: templates.find((t) => t.tier === Tier.GALACTICO)?.id ?? null,
      burnOnComplete: true,
    },
  });
  // Desafio Relâmpago (Fase 8): tenha o Lance de um jogador que marcar hoje (stats simuladas).
  await prisma.challenge.create({
    data: {
      type: ChallengeType.FLASH,
      name: 'Artilheiro do Dia',
      description: 'Tenha no elenco o Lance de quem balançar a rede hoje e resgate um pacote.',
      startsAt: days(-1),
      endsAt: days(30),
      rewardPackId: checkinPack.id,
      flashRuleJson: { rule: 'own_moment_of_scorer', stat: 'gols', min: 1 },
    },
  });
  // Checklist alinhado à coleção do colecionador (bônus vai pro ranking do time + Collector Score).
  await prisma.checklist.create({
    data: {
      name: `Checklist ${flamengo.name} — Brasileirão 2025`,
      kind: flamengo.name,
      requiredTemplateIds: [seedTemplates[2].id, seedTemplates[3].id],
      bonusPoints: 500,
    },
  });

  // ---------------------------------------------------------------- Wishlist + Vitrine
  const ownedTemplateIds = new Set(seedTemplates.map((t) => t.id));
  const wishTemplates = templates.filter((t) => !ownedTemplateIds.has(t.id)).slice(0, 3);
  for (const t of wishTemplates) {
    await prisma.wishlist.create({ data: { userId: collector.id, templateId: t.id } });
  }
  const showcase = await prisma.showcase.create({
    data: { ownerId: collector.id, name: 'Minha Vitrine', description: 'Meus Lances favoritos do Brasileirão 2025.', public: true },
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
