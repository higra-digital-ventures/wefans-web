# DECISIONS.md — decisões de implementação do wefans

> Registro vivo. Cada desvio da especificação (`.claude/wefans_claude_code_brief.md`)
> é anotado aqui com o motivo, conforme instrução da seção 1 do brief.

## Formato
`AAAA-MM-DD — [Fase] — Decisão — Motivo`

---

## Stack confirmada (seção 1)
- **2026-07-01 — [Fase 0] — Backend = Fastify + TypeScript + Prisma + Zod (porta 4000).**
  Módulos CommonJS (menos atrito com `tsx`/Prisma/Fastify; `tsc` gera `dist/` executável por node).
- **2026-07-01 — [Fase 0] — Frontend = Next.js 15 (App Router) + React 19 + TypeScript + Tailwind (porta 3000).**
  Next 15 satisfaz "14+". Tailwind **v3.4** (não v4): o padrão de tokens-no-config da seção 11.1
  é direto no v3; o config CSS-first do v4 é uma mudança maior — reavaliar na Fase 11.
- **2026-07-01 — [Fase 0] — Dinheiro sempre em centavos (Int).** Nunca float. (Já no brief.)

## Desvios registrados
- **2026-07-01 — [Fase 0] — Banco local (Postgres 14 via Homebrew) em vez de Docker.**
  **Motivo:** Docker não está instalado nesta máquina; há um Postgres 14 rodando
  (`brew services`) com os bancos `wefans` e `wefans_shadow` já criados e graváveis.
  O `docker-compose.yml` foi **mantido** para portabilidade; `scripts/db-up.sh` e `dev.sh`
  **detectam** Docker e caem para o Postgres local caso ausente.
  Conexão local usa o usuário do SO (`jonathan`, superuser, sem senha — trust auth).
- **2026-07-01 — [Fase 0] — `shadowDatabaseUrl` NÃO fixado no schema.** O usuário do banco
  é superuser com `CREATEDB`, então o Prisma cria/descarta a shadow DB automaticamente
  (funciona tanto no Postgres local quanto no superuser do Docker). O `wefans_shadow`
  pré-criado fica ocioso (inofensivo).
- **2026-07-01 — [Fase 0] — Migrações versionadas + `migrate deploy` no `setup`.**
  A migração inicial (`init`) é criada com `prisma migrate dev` e **commitada**. O
  `npm run setup` (clone novo) aplica com `prisma migrate deploy` (não-interativo);
  desenvolvimento usa `npm run db:migrate:dev`. `prisma generate` roda no `postinstall`.
- **2026-07-01 — [Fase 0→11] — Fontes: system stack na Fase 0; na Fase 11 entraram as
  fontes da marca via `next/font/google` (Anton/Outfit/Space Mono) injetando as mesmas
  variáveis CSS (`--font-display/text/mono`) — troca sem refatorar, como planejado.

## Ambiente de desenvolvimento atual (Windows)
- **2026-07-02 — [pós-v1] — Dev migrado para Windows 11 com PostgreSQL 18 local (serviço
  `postgresql-x64-18`, porta 5432), sem Docker.** Substitui o setup macOS/Homebrew
  registrado abaixo. Autenticação por senha (scram-sha-256) com o usuário `postgres` —
  a `DATABASE_URL` mora em `backend/.env` (não commitado); `SHADOW_DATABASE_URL` aponta
  para `wefans_shadow` (no Windows o `pg_hba` não tem trust auth). Os scripts bash
  (`dev.sh`, `scripts/db-up.sh`) exigem o bin do Postgres no PATH:
  `export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH"`. O serviço sobe com o SO,
  então `npm run dev` funciona direto no dia a dia.

## Pendências de referência
- **2026-07-01 — Protótipos HTML ausentes.** `wefans.html` e `wefans_3d_moment.html`
  (citados nas seções 11.1 e 11.7) **não estão no repositório**. O design será
  implementado a partir dos tokens da seção 11; se os protótipos forem adicionados,
  reconciliar aparência na Fase 11 / 3D Moment.

## Extensões de schema além do esqueleto da seção 4 (todas previstas no brief)
- `status` + `publishAt` em **Team, Series, Set, Template** (ciclo de publicação, seção 10.1).
- `parallel String @default("BASE")` em **Template** e **Moment** (seção 11.13).
- Modelo **Wishlist** `(userId, templateId)` (seção 11.13).
- `ticketOnly Boolean` em **Pack** (regra 13 da seção 6 + seed da seção 7).
- `favoriteTeamId` + `checkinStreak` em **User** (seção A2.3).
- Modelos de check-in **Team/Stadium/Fixture/CheckIn** (seção A2.3).
- Relações inversas completas e índices em FKs (pedido explícito da seção 4).

## Notas técnicas (descobertas na Fase 0)
- **2026-07-01 — Prisma grava `DateTime` como `timestamp` (UTC).** Ao comparar datas em
  **SQL cru** (ex.: janela de check-in na Fase CK), compare em UTC
  (`coluna < (now() AT TIME ZONE 'UTC')`) ou faça no JS/Prisma com objetos `Date`.
  A sessão local do Postgres é `America/Sao_Paulo` (-03); comparar `timestamp` com
  `now()` (timestamptz) direto dá resultado deslocado. O app compara via `Date` (UTC), ok.
- **2026-07-01 — `package.json#prisma.seed` está deprecado** (Prisma 7 pedirá
  `prisma.config.ts`). Mantido no Prisma 6 (funciona com aviso); migrar ao subir p/ Prisma 7.

## Fase CK — check-in por geolocalização
- **2026-07-01 — [Fase CK] — Atestação de dispositivo SIMULADA na web.**
  **Motivo:** Play Integrity / App Attest exigem o **app Flutter real** (ainda inexistente).
  `verifyAttestation()` aceita tokens de dev (`dev-ok`/`dev-*`) fora de produção; em
  produção retorna `false` (plugar **Firebase App Check** quando o app existir). Todo o
  resto da validação (janela, **geofence haversine**, sinais de mock, precisão, **nonce**
  challenge-response, unicidade `(userId,fixtureId)`, **teleport/velocidade** → REVIEW) é
  **real e 100% server-side**. A página web `/checkin` é um **simulador** do fluxo do app.
- **2026-07-01 — [Fase CK] — Rejeições "duras" não persistem CheckIn.** Rejeições por regra
  (fora do raio/janela, mock, precisão, atestado, nonce) são **logadas** e retornadas, mas
  **não criam linha** `CheckIn` — assim o usuário legítimo pode **retentar** (com novo nonce).
  Só `VALID` e `REVIEW` persistem, ocupando o slot único `(userId,fixtureId)` — garante
  "1 pacote por jogo" e nunca duplica sob concorrência (unique + P2002 tratado).

## Fase 9 — Pelada (Fast Break)
- **2026-07-01 — [Fase 9] — Parâmetros do jogo (afináveis em `services/fastbreak.ts`):**
  captain multiplica a stat por **2×**; marco de recompensa = **3 vitórias** no run
  (concede `run.rewardPackId`); **fadiga por ASP**: usos por jogador no run =
  `<R$10→1 · <R$50→2 · <R$200→3 · <R$1000→4 · ≥R$1000→5` (ASP em centavos do melhor
  Moment do jogador — "o sistema prioriza o Moment com mais usos disponíveis").
- **2026-07-01 — [Fase 9] — Fechamento do dia é ação de admin** (`/admin/fastbreak/days/:id/close`);
  o cron da Fase 10 automatiza. Survivor: derrota em dia fechado ⇒ eliminado (derivado
  das lineups, sem campo extra). Migração hand-written (`migrate dev` agora recusa
  ambiente não-interativo; SQL equivalente + `migrate deploy`).

## Adiado para fases posteriores (não construído na Fase 0)
- Auth real (cookie web + JWT/refresh app) — **Fase 1**. Seed já grava `passwordHash` com bcrypt.
- Lógica dos serviços `mint`/`market`/`checkin` — **Fases 2/4/CK** (na Fase 0 só a estrutura).
- Geração de spec **OpenAPI** e cliente Dart — a partir da Fase 1.

## Fase 10 — Admin
- **2026-07-01 — [Fase 10] — Assistente de onboarding (10.3) simplificado.** Em vez do
  wizard multi-etapas, o admin tem: criar time+estádio (um form), cadastro de conteúdo em
  rascunho e o botão único **"Liberar parceria"** (publica time+conteúdo em transação) —
  a mesma semântica, sem o passo-a-passo. Wizard completo fica como melhoria futura.
- **2026-07-01 — [Fase 10] — Cron in-process** (`jobs/cron.ts`, setInterval 60s + tick na
  subida + endpoint manual `/admin/cron/tick`). Sem broker/fila externa na v1 (seção 1).

## Fases 11–13 — Polimento, Hardening, On-chain
- **2026-07-01 — [Fase 11] — 3D Moment em Three.js** (`components/Moment3D.tsx`): slab
  2.4×3×1.0 com CanvasTexture por face e moldura de 12 barras emissivas; sem
  post-processing (glow fake por cor, como pedia a seção 11.7). O protótipo
  `wefans_3d_moment.html` não estava no repo — implementado da especificação.
- **2026-07-01 — [Fase 12] — Rate limit de credencial relaxado fora de produção**
  (10/min em prod, 100/min em dev) para a suíte de integração não flakear.
- **2026-07-01 — [Fase 13] — On-chain entregue como abstração** (`services/ownership.ts`):
  interface `OwnershipProvider` + `DbOwnership` (posse em banco) e `POST /wallet/withdraw`
  como stub honesto. A integração real (Flow/L2, App Check etc.) fica para quando houver
  decisão de chain — os serviços não precisarão mudar (mutações de posse já são atômicas
  e centralizadas).

## Explorar como feed social (pós-v1)
- **2026-07-03 — /explorar deixou de ser catálogo e virou o feed de eventos** (gramática do
  "Explore" do Top Shot). **Camada A apenas**: `GET /api/v1/feed` agrega o que a economia
  já registra — vendas (BUY/OFFER_ACCEPT), aberturas de pacote (MINTs agrupados por
  usuário em janelas de 90s), presentes, queimas, desafios (`ChallengeEntry`), missões
  (`QuestClaim`) e **check-ins válidos** — mais "populares 24h". Zero modelo novo, só
  leitura (`services/feed.ts`). Rail pessoal: checklists perto de completar + wishlist.
  O catálogo continua acessível em /mercado e /pacotes. **Camadas B/C** (reações,
  posts/comentários/follows) ficam para o roadmap — exigem moderação e LGPD.
- **2026-07-03 — Iteração 2 do feed:** evento "colocou à venda" (Listing) com CTA,
  destaque foil p/ pulls Lendário/Galáctico, @username → perfil público, abas de filtro,
  aviso "N novos eventos" (polling 15s + refresh SSR), **cache in-memory** (12s feed /
  60s populares — opt-out pode demorar até 12s p/ refletir), índices compostos
  (`Transaction[type,createdAt]`, `Listing[status,createdAt]`) e **opt-out de
  privacidade** (`User.showInFeed`, toggle no /perfil, PATCH /me) — primeiro passo LGPD.

## Tipografia (pós-v1)
- **2026-07-03 — Fontes trocadas para as mesmas famílias abertas que o Top Shot usa.**
  Anton/Outfit/Space Mono → **Sofia Sans Extra Condensed** (display, peso 800 via
  `.font-display`) · **Roboto Flex** (texto) · **Roboto Mono** (série/preços).
  **Licenciamento:** as três são Google Fonts (OFL) de terceiros — usar as mesmas famílias
  **não** viola o LEGAL.md (que proíbe copiar ativos proprietários da NBA/Dapper). A única
  fonte proprietária do Top Shot ("Owners"/wide, da Mass-Driver) **não** foi usada; se um
  dia quisermos o efeito "wide", alternativas abertas: Archivo ou Anybody (eixo de largura).
  Troca feita só no `layout.tsx` (mesmas variáveis `--font-display/text/mono`), como
  planejado na Fase 11.

## Renomeações de produto
- **2026-07-03 — "Pelada" → "Matchday".** O modo fantasy diário (Fast Break) passou a se
  chamar **Matchday** (termo em inglês, escolhido pelo dono do produto; "dia de jogo" casa
  com a mecânica de escalação por rodada). Rota `/jogar/pelada` → `/jogar/matchday` com
  redirect permanente no `next.config.mjs`; componente `PeladaDayClient` →
  `MatchdayDayClient`; textos de UI, seed (nome do run), comentários e docs atualizados.
  Nomes técnicos internos (`fastbreak` em rotas de API, serviços, schema e testes)
  **mantidos** — são o termo do brief e não aparecem para o usuário.

## Passe de design (pós-Fase 13) — telas de referência do usuário
- **2026-07-01 — Design refeito na gramática exata dos prints do Top Shot** (seção 11.12),
  mantendo a marca wefans: top bar com ícones+sublinha ativa e carteira/avatar; carta de
  mercado com mídia em perspectiva 3D (face lateral falsa), marcador de wishlist e rodapé
  Menor preço/Média; sub-abas em caps; página do Momento com breadcrumb em chips, painel
  de compra (CTA cheio), painéis colapsáveis (DETALHES/HISTÓRICO/OFERTAS) e "Mais Lances";
  home de produto (hero do drop + Rip Packs + feed ao vivo + títulos em dois tons);
  drops com pill "% reservado" e faixa SOLD OUT; footer institucional completo; fundo
  quase-preto com glow sutil (menos "cara de IA"); emojis removidos das ações principais.
