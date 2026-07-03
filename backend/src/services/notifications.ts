import type { PrismaClient } from '@prisma/client';

/**
 * Notificações do usuário — derivadas dos eventos que a economia já registra
 * (mesma filosofia do feed do Explorar): venda dos seus Lances, presentes,
 * ofertas recebidas, check-ins resolvidos, janela de drop e rodadas do Matchday.
 * Estado de leitura = marca d'água `User.notificationsSeenAt` (uma coluna, sem
 * tabela nova); "não lidas" = itens mais novos que a marca.
 */

type Notification = {
  id: string;
  kind: 'SALE' | 'GIFT' | 'OFFER' | 'CHECKIN' | 'DROP_WINDOW' | 'MATCHDAY' | 'WISHLIST';
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

const money = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export async function getNotifications(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notificationsSeenAt: true },
  });
  const momentInclude = {
    moment: { include: { template: { include: { player: true } } } },
  } as const;

  const [sales, gifts, offers, checkins, windows, lineups, wishlistHits] = await Promise.all([
    db.transaction.findMany({
      where: { type: { in: ['BUY', 'OFFER_ACCEPT'] }, sellerId: userId },
      include: { ...momentInclude, buyer: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.transaction.findMany({
      where: { type: 'GIFT', buyerId: userId },
      include: { ...momentInclude, seller: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.offer.findMany({
      where: { status: 'ACTIVE', moment: { ownerId: userId } },
      include: { ...momentInclude, buyer: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.checkIn.findMany({
      where: { userId, status: { in: ['VALID', 'REJECTED', 'REVIEW'] } },
      include: { fixture: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.queueEntry.findMany({
      where: { userId, purchased: false, windowStartsAt: { not: null, lte: new Date() } },
      include: { drop: true },
      take: 5,
    }),
    db.fastBreakLineup.findMany({
      where: { userId, day: { closedAt: { not: null } } },
      include: { day: { include: { run: { select: { name: true } } } } },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    }),
    // alerta de wishlist: anúncios ativos (de outros) em edições que eu marquei
    db.listing.findMany({
      where: {
        status: 'ACTIVE',
        sellerId: { not: userId },
        moment: { template: { wishlist: { some: { userId } } } },
      },
      include: momentInclude,
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const items: Notification[] = [];

  for (const s of sales) {
    const t = s.moment.template;
    items.push({
      id: `sale-${s.id}`,
      kind: 'SALE',
      title: 'Lance vendido',
      body: `${t.player.name} #${s.moment.serial} foi vendido por ${money(s.amountCents)} para @${s.buyer?.username ?? '—'}.`,
      href: `/momento/${s.momentId}`,
      createdAt: s.createdAt.toISOString(),
    });
  }
  for (const g of gifts) {
    const t = g.moment.template;
    items.push({
      id: `gift-${g.id}`,
      kind: 'GIFT',
      title: 'Você recebeu um presente',
      body: `@${g.seller?.username ?? '—'} te enviou ${t.player.name} #${g.moment.serial}.`,
      href: `/momento/${g.momentId}`,
      createdAt: g.createdAt.toISOString(),
    });
  }
  for (const o of offers) {
    if (!o.moment) continue;
    const t = o.moment.template;
    items.push({
      id: `offer-${o.id}`,
      kind: 'OFFER',
      title: 'Nova oferta recebida',
      body: `@${o.buyer.username} ofereceu ${money(o.priceCents)} por ${t.player.name} #${o.moment.serial}.`,
      href: `/momento/${o.momentId}`,
      createdAt: o.createdAt.toISOString(),
    });
  }
  for (const c of checkins) {
    const jogo = `${c.fixture.homeTeam.name} x ${c.fixture.awayTeam.name}`;
    items.push({
      id: `ci-${c.id}`,
      kind: 'CHECKIN',
      title:
        c.status === 'VALID'
          ? 'Check-in aprovado'
          : c.status === 'REVIEW'
            ? 'Check-in em análise'
            : 'Check-in rejeitado',
      body:
        c.status === 'VALID'
          ? `Prova de presença em ${jogo} confirmada — seu pacote foi liberado.`
          : c.status === 'REVIEW'
            ? `Seu check-in em ${jogo} está na fila de revisão.`
            : `Seu check-in em ${jogo} foi rejeitado${c.rejectionReason ? ` (${c.rejectionReason})` : ''}.`,
      href: '/checkin',
      createdAt: c.createdAt.toISOString(),
    });
  }
  for (const w of windows) {
    items.push({
      id: `drop-${w.id}`,
      kind: 'DROP_WINDOW',
      title: 'Sua vez no drop',
      body: `Sua janela de compra abriu no drop ${w.drop.name} (posição #${w.position}).`,
      href: `/drop/${w.dropId}`,
      createdAt: w.windowStartsAt!.toISOString(),
    });
  }
  for (const l of lineups) {
    items.push({
      id: `md-${l.id}`,
      kind: 'MATCHDAY',
      title: l.won ? 'Vitória no Matchday' : 'Rodada do Matchday encerrada',
      body: `${l.day.run.name} · Dia ${l.day.dayNumber}: seu score foi ${l.score} (alvo ${l.day.targetScore}) — ${l.won ? 'você venceu!' : 'não foi dessa vez.'}`,
      href: `/jogar/matchday/dia/${l.dayId}`,
      createdAt: (l.day.closedAt ?? l.submittedAt).toISOString(),
    });
  }

  for (const l of wishlistHits) {
    const t = l.moment.template;
    const belowAvg = t.aspCents > 0 && l.priceCents < t.aspCents;
    items.push({
      id: `wl-${l.id}`,
      kind: 'WISHLIST',
      title: belowAvg ? 'Item da wishlist abaixo da média' : 'Item da sua wishlist à venda',
      body: `${t.player.name} #${l.moment.serial} listado por ${money(l.priceCents)}${t.aspCents > 0 ? ` (média ${money(t.aspCents)})` : ''}.`,
      href: `/momento/${l.momentId}`,
      createdAt: l.createdAt.toISOString(),
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const notifications = items.slice(0, 20);
  const seenAt = user?.notificationsSeenAt?.toISOString() ?? new Date(0).toISOString();
  const unreadCount = notifications.filter((n) => n.createdAt > seenAt).length;

  return { notifications, unreadCount };
}

export async function markNotificationsSeen(db: PrismaClient, userId: string) {
  await db.user.update({ where: { id: userId }, data: { notificationsSeenAt: new Date() } });
  return { ok: true };
}
