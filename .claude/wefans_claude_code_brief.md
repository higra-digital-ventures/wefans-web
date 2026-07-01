# wefans — Plataforma de Momentos de Futebol (paridade total com NBA Top Shot)

> **Instrução para o Claude Code.** Construa uma plataforma de colecionáveis digitais de
> **futebol** com **paridade de funcionalidades 1:1 com o NBA Top Shot** — só que o
> conteúdo são **lances/momentos de futebol**. Use este documento como especificação.
> Trabalhe em **fases** (seção 12), commit ao fim de cada fase, e só avance quando os
> **critérios de aceite** estiverem cumpridos. Mantenha um `DECISIONS.md` para escolhas
> de implementação e um `PARITY.md` marcando cada item da seção 2 conforme entrega.

---

## 1. Decisões de stack (já tomadas — troque só com motivo, registre no DECISIONS.md)

- **Estrutura: monorepo com pastas separadas** (igual a outros projetos do dono):
  ```
  wefans/
    .claude/      → CENTRALIZAR AQUI: todo agente e todo .md do projeto
                    (CLAUDE.md, este brief, DECISIONS.md, PARITY.md, LEGAL.md,
                     agentes/subagentes, commands) ficam na raiz .claude
    backend/      → API + regra de negócio + Prisma (servidor, expõe /api/v1)
    frontend/     → web client (consome a API; nada de lógica de negócio aqui)
    package.json  → workspaces + scripts raiz (subir os dois juntos)
    docker-compose.yml → Postgres local
    .env.example
  ```
  (O **app Flutter** mora em repositório/pasta própria — `mobile/` — e também é só cliente da API.)
- **Convenção de documentação/agentes:** **qualquer agente, subagente, comando ou arquivo
  `.md`** deste projeto deve ser criado **na pasta raiz `.claude/`** — para centralizar tudo
  num só lugar. Não espalhe `.md` pelas subpastas; docs de código específico (ex.: README de
  `backend/`) são a única exceção. Coloque **este brief** e os arquivos vivos
  (`DECISIONS.md`, `PARITY.md`, `LEGAL.md`) em `.claude/`.
- **backend/**: Node + TypeScript + **Fastify** (ou Express/NestJS) + **Prisma** (PostgreSQL)
  + **Zod**. Hospeda a **camada de serviço** e expõe **REST `/api/v1`** (seção A1). Porta 4000.
- **frontend/**: **Next.js 14+ (App Router) + TypeScript + Tailwind**, consumindo `/api/v1`.
  Porta 3000. Design tokens na seção 11.
- **Auth:** credenciais (email+senha, **bcrypt**). Backend emite **cookie httpOnly p/ web** e
  **JWT access + refresh p/ app** (seção A1). Sem OAuth na v1.
- **Dinheiro:** carteira simulada em BRL (saldo em **centavos**, Int). Adaptador
  `PaymentProvider` com impl `FakeWallet` (depois plugar Stripe). **Nunca float.**
- **Tempo real:** SSE ou polling para fila de drop, Fast Break e Flash Challenges (sem broker na v1).
- **Jobs agendados:** runner de cron **no backend** (snapshots de leaderboard, encerramento
  de challenges/runs, promoção de conteúdo `AGENDADO→PUBLICADO`).
- **Deploy alvo:** backend (Railway/Render/Fly) + frontend (Vercel) + Postgres gerenciado
  (Neon/Supabase). Cada pasta com seu `.env.example`.

### 1.1 Scripts raiz — subir backend + frontend juntos (local)
`package.json` da raiz usa **npm workspaces** + **`concurrently`**:
```json
{
  "name": "wefans",
  "private": true,
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "dev": "concurrently -n back,front -c magenta,cyan \"npm -w backend run dev\" \"npm -w frontend run dev\"",
    "db:up": "docker compose up -d",
    "db:migrate": "npm -w backend run prisma:migrate",
    "db:seed": "npm -w backend run seed",
    "setup": "npm install && npm run db:up && npm run db:migrate && npm run db:seed",
    "build": "npm -w backend run build && npm -w frontend run build"
  },
  "devDependencies": { "concurrently": "^9" }
}
```
Inclua também um **`dev.sh`** na raiz que faça o fluxo completo: sobe o Postgres
(`docker compose up -d`), espera ficar pronto, roda migrate+seed se necessário e então
executa `npm run dev`. Fluxo de quem clona o repo: `npm run setup && npm run dev` →
backend em `:4000`, frontend em `:3000`. Documente no `README.md`.

- **Auth:** ~~Auth.js~~ ver acima (auth própria no backend, cookie+JWT).
- **Estilo:** Tailwind CSS no frontend. Design tokens na seção 11.

> **IP/legal (obrigatório):** **NÃO** usar nomes, escudos, fotos ou vídeos reais de
> jogadores, clubes ou ligas. Todo conteúdo do seed é **fictício**. Vídeo = placeholder
> (clipe livre ou poster + animação de trajetória). Documente em `LEGAL.md`. As
> estatísticas "ao vivo" de Flash Challenges e Fast Break são **simuladas** por um
> motor de partidas fake (seção 8).

> **⭐ Visão de produto:** existe **web** (este documento) **e um app mobile**. O
> diferencial do app é **ganhar pacotes fazendo check-in por geolocalização no raio do
> estádio em dia de jogo do time** (seção A2). Por isso o backend é **API-first**: a web
> é só o primeiro cliente; o app consome a mesma API. Leia as seções **A1 (arquitetura
> multi-cliente)** e **A2 (check-in)** antes de começar — elas mudam decisões da Fase 1.

---

## A1. Arquitetura multi-cliente (web + app) — API-first ⭐

**Regra de ouro:** **toda regra de negócio vive no `backend/`, numa camada de serviço
agnóstica de transporte**; o **frontend web** e o **app Flutter** são **dois clientes finos**
da mesma API REST. Nunca há lógica de negócio no frontend.

- **Camada de serviço** em `backend/src/services/*` (ex.: `mint.ts`, `market.ts`, `checkin.ts`).
  Funções puras que recebem um **contexto** `{ db, userId }` e dados já validados, e retornam
  DTOs. **Não conhecem** Request/Response, cookies nem React.
- **Controllers/rotas** em `backend/src/routes/api/v1/*`: finos — autenticar → validar (Zod)
  → chamar serviço → serializar JSON.
- **Frontend web** (`frontend/`, Next.js) consome `/api/v1` como qualquer cliente (fetch/
  React Query). Pode usar server components só pra *buscar* da API; **nenhuma** regra de
  negócio mora aqui.
- **App Flutter** consome **a mesma** `/api/v1`. Mesma API, dois clientes.
- **DTOs estáveis:** nunca exponha modelos Prisma crus; mapeie para DTOs versionados.
- **Auth desde a Fase 1 (própria, no backend):**
  - Web: **cookie httpOnly** (sessão/JWT em cookie).
  - App: **access token (JWT ~15 min) + refresh token rotativo**.
    `POST /api/v1/auth/login`, `/auth/refresh`, `/auth/logout`.
  - Resolvedor único `getAuthContext(req)` aceita **cookie OU bearer** e devolve `userId`.
    Os serviços recebem só o `userId` — não sabem qual cliente chamou.
- **Versionamento:** tudo sob `/api/v1`. Envelope de erro consistente
  `{ error: { code, message, details? } }`. Rate limit por usuário/IP/dispositivo.
- **Contrato compartilhado via OpenAPI:** como o app é **Dart** e o back é **TS**, não há
  reuso direto de tipos. A fonte única do contrato é um **spec OpenAPI** do `/api/v1`
  (gerado do back, ex.: `zod-to-openapi`). A partir dele, **gere o cliente Dart** pro
  Flutter (`openapi-generator` / `swagger_dart_code_generator`) e, se quiser, tipos TS pra
  web. Assim o contrato fica versionado e os dois clientes nunca saem de sincronia.
- **App = Flutter (escolhido).** Multiplataforma (iOS+Android) com um código só. Pacotes
  nativos prontos: **`geolocator`** (geolocalização, com flag `isMocked` no Android) e
  **Firebase App Check** (cobre **Play Integrity** no Android e **App Attest** no iOS num
  único fluxo verificável no servidor). O app **não** é projeto novo: é um segundo cliente
  da mesma API. (O back não muda se um dia trocar de framework de app.)

**Endpoints espelho da economia** (mínimo p/ o app): `GET /api/v1/me`,
`GET /api/v1/collection`, `GET /api/v1/market`, `POST /api/v1/listings`,
`POST /api/v1/listings/:id/buy`, `GET /api/v1/packs`, `POST /api/v1/packs/:id/buy`,
`POST /api/v1/packs/inventory/:id/open`, além dos de auth e dos de check-in (A2).

---

## A2. Check-in por geolocalização (o diferencial do app) ⭐

**Mecânica:** em **dia de jogo do time que o usuário segue**, estando **dentro do raio do
estádio** dentro da **janela do jogo**, o usuário faz check-in no app e **ganha um pacote
de figurinhas** (com Lances/Moments). É "prova de presença" — escassez que o Top Shot não tem.

### A2.1 Regra de recompensa (configurável)
- **Padrão v1:** **1 pacote por jogo por usuário** — exatamente **1 check-in válido por
  partida** (constraint única `(userId, fixtureId)`).
- **Camada extensível (config/flag):** **recompensa por presença na temporada** — sequência
  de jogos com check-in (streak) destrava pacote/Moment especial a cada N presenças.
  Implementar atrás de flag; ligar quando quiser.

### A2.2 Anti-spoofing — **NÃO CONFIE NO CLIENTE** (validação 100% server-side)
Falsificação de GPS é o maior risco; é o que decide se a mecânica sobrevive. Todo check-in
só é aceito se passar em **todas** estas verificações no servidor:
1. **Jogo válido e ao vivo:** existe `Fixture` do time seguido e `now ∈ [checkinOpensAt,
   checkinClosesAt]` (ex.: de 2h antes do apito a 1h depois do fim).
2. **Geofence:** distância **haversine** entre `(lat,lng)` enviados e o **centroide do
   estádio** ≤ `stadium.radiusMeters`.
3. **Integridade do dispositivo (obrigatório):** **Play Integrity** (Android) e
   **App Attest/DeviceCheck** (iOS). No Flutter, use **Firebase App Check** (cobre os dois);
   o app envia o token de atestado e o **servidor verifica**. Rejeitar emulador,
   root/jailbreak ou atestado inválido.
4. **Sinais de mock:** o app envia `isMocked` (do pacote **`geolocator`** no Android) e a
   `accuracy`; rejeitar `isMocked=true` e precisão absurda/baixa demais (ex.: > 100m) —
   fake GPS costuma denunciar. Mesmo assim, **a posição é só um insumo**: a decisão é do servidor.
5. **Unicidade & rate limit:** 1 por `(userId, fixtureId)`; limites por usuário/dispositivo/IP.
6. **Teleport/velocidade:** rejeitar se o usuário fez check-in em estádio distante há pouco
   tempo (velocidade impossível).
7. **Replay/nonce:** o app pega um **nonce de curta validade** (`GET /api/v1/checkin/nonce`)
   e o envia no check-in; servidor valida e invalida (challenge-response).
8. **Sem auto-grant em dúvida:** sinais suspeitos → `status=REVIEW` (fila de fraude do
   admin), nunca pacote automático. Logar tudo (coords, accuracy, atestado, IP, device id).

### A2.3 Modelo de dados (adicione ao schema)
```prisma
model Team {
  id String @id @default(cuid())
  name String
  homeStadiumId String?
  partnerStatus String @default("PROSPECT")  // PROSPECT|ATIVO|PAUSADO|ENCERRADO
  status String @default("RASCUNHO")         // RASCUNHO|AGENDADO|PUBLICADO|ENCERRADO
  publishAt DateTime?
}
model Stadium {
  id String @id @default(cuid())
  name String city String
  lat Float lng Float
  radiusMeters Int @default(300)
}
model Fixture {                 // o "dia de jogo"
  id String @id @default(cuid())
  homeTeamId String awayTeamId String stadiumId String
  kickoffAt DateTime status String @default("SCHEDULED") // SCHEDULED|LIVE|FINISHED
  checkinOpensAt DateTime checkinClosesAt DateTime
  rewardPackId String          // pacote concedido pelo check-in
}
model CheckIn {
  id String @id @default(cuid())
  userId String fixtureId String
  lat Float lng Float accuracyM Float
  isMock Boolean @default(false)
  attestationOk Boolean @default(false)
  status String @default("PENDING")  // PENDING|VALID|REJECTED|REVIEW
  rejectionReason String?
  grantedPackInventoryId String?
  createdAt DateTime @default(now())
  @@unique([userId, fixtureId])
}
// User: adicionar  favoriteTeamId String?  e (opcional) checkinStreak Int @default(0)
```

### A2.4 Endpoints
- `GET /api/v1/checkin/nonce` → nonce curto (challenge-response).
- `GET /api/v1/fixtures/active` → jogos do time seguido na janela de check-in agora.
- `POST /api/v1/checkin` `{ fixtureId, lat, lng, accuracy, isMock, attestationToken, nonce }`
  → roda A2.2 numa **transação**; se VALID, **minta o pacote** (cria `PackInventory` via o
  mesmo serviço de mint) e retorna o grant; senão retorna o motivo (ou REVIEW).
- `GET /api/v1/checkin/history` → histórico do usuário.
- Admin: CRUD de Teams/Stadiums/Fixtures + **fila de revisão de fraude**.

### A2.5 Seed
Adicionar ~6 Teams fictícios com Stadiums (lat/lng/raio reais de praças genéricas), e
2–3 Fixtures: um **ao vivo agora** (janela aberta, p/ testar o fluxo feliz) e outros
agendados. O motor de simulação (seção 8) pode usar os Fixtures como fonte dos jogos.

---

## 2. Paridade de funcionalidades (Top Shot → wefans) — TUDO deve existir

| # | Top Shot | wefans (futebol) | Fase |
|---|----------|------------------|------|
| 1 | Moments (NFT de highlight) | **Lances** numerados (golaço, defesa, drible, falta) | 2 |
| 2 | Series → Sets → Tiers | **Temporada → Coleções → Raridades** | 0/2 |
| 3 | Tiers: Common, Fandom, Rare, Legendary, Ultimate | Comum, Torcida, Raro, Lendário, Galáctico | 0 |
| 4 | Edições: CC (aberta) e LE (limitada) | Circulante (aberta) e Limitada (tiragem fixa) | 2 |
| 5 | Numeração de série (#23/100), low serial = prestígio | idem | 2 |
| 6 | Badges em Moments (rookie, campeão…) | Selos (estreia, título, hat-trick…) | 2 |
| 7 | Pack Drops com sala de espera + fila randômica + janela 20min | idem | 6 |
| 8 | Rebound packs (secundários) | Pacotes de repescagem | 6 |
| 9 | Allowlist / requisito de Collector Score para entrar na fila | idem | 6 |
| 10 | Abertura de pacote com revelação | idem (anima como o protótipo) | 2 |
| 11 | Pack Marketplace (compra/venda de pacotes lacrados) | Mercado de Pacotes | 6 |
| 12 | Marketplace de Moments: Buy Now (preço fixo), listar/deslistar | idem | 4 |
| 13 | Taxa da plataforma, floor price, indicador "À venda" | idem | 4 |
| 14 | Offers (ofertar em Moment listado ou não) | Ofertas | 5 |
| 15 | Average Sale Price (ASP) + Pricing Helper | Preço médio + ajudante de preço | 4 |
| 16 | Gifting (presentear Moments) | Presentear | 5 |
| 17 | Trade Tickets (1 por Moment → pacotes exclusivos) | Fichas de Troca | 7 |
| 18 | Locking (trava 1 ano; não vende/transfere/queima) | Travar | 5 |
| 19 | Burn / Crafting Challenges (queima por recompensa) | Queima / Desafios de Forja | 5 |
| 20 | Challenges + Challenge Builder (montar entrada) | Desafios + Montador de Entrada | 5 |
| 21 | Flash Challenges (baseados em jogo ao vivo) | Desafios Relâmpago | 8 |
| 22 | Quests / Showcase Challenges (caça ao tesouro) | Missões | 7 |
| 23 | Showcases (álbuns curados) | Vitrines | 7 |
| 24 | Top Shot Score (preço×10, dinâmico, reseta no max(preço,ASP)) | Pontuação wefans | 4 |
| 25 | Collector Score (pontos por tier/série/recompensa) | Score do Colecionador | 6 |
| 26 | Leaderboards Time/Jogador (sobe travando Moments) | Rankings Time/Jogador | 8 |
| 27 | Checklists de Time/Série com bônus | Checklists | 8 |
| 28 | Fast Break (fantasy: lineup/noite, fadiga, captain, runs) | Pelada (fantasy) | 9 |
| 29 | Survivor pool no Fast Break | Mata-mata (survivor) | 9 |
| 30 | Carteira (Dapper Balance), depósito | Carteira + depósito (simulado) | 1 |
| 31 | Withdraw para wallet não-custodial / redeem físico | Saque on-chain / resgate (Fase opcional) | 13 |
| 32 | Provenance (histórico de dono) | Procedência | 3 |
| 33 | Perfil com score e estatísticas | Perfil | 3 |
| 34 | Code of Conduct / revisão anti-wash-trading | Conduta / revisão de preço anômalo | 4 |
| 35 | Painel admin de conteúdo e drops | Admin | 10 |

Marque cada linha no `PARITY.md` ao concluir.

---

## 3. Conceitos do domínio

- **Series (Temporada):** ciclo anual (ex.: "Temporada 1 · 25/26"). Contém Coleções.
- **Set/Collection (Coleção):** grupo temático de Templates dentro de uma Temporada
  (ex.: "Base", "Estreias", "Golaços da Rodada").
- **Player (fictício):** jogador, clube fictício, número, posição, nacionalidade.
- **Template do Lance:** a "edição" — título, tipo de jogada, competição, data, vídeo
  (placeholder), trajetória SVG, **raridade**, **tipo de edição** (Circulante/Limitada),
  **tiragem** (se limitada), selos (badges), set. Guarda `mintedCount` e `asp`.
- **Moment (Lance colecionável):** instância **numerada** de um Template (`#serial/N`).
  É o que o usuário possui. Tem `topShotScore` próprio, flags `locked/burned`, dono.
- **Pack:** produto que minta N Moments por sorteio ponderado de raridade. Tem preço,
  oferta total, vendidos, odds, garantia de tier mínimo. Pode estar num **Drop** com fila.
- **Drop:** lançamento com janela; controla sala de espera, fila, requisito de score,
  allowlist e rebound packs.
- **Listing / Offer / Transaction:** mercado secundário e procedência.
- **Showcase, Quest, Challenge (Standard/Flash/Crafting), Leaderboard, Checklist,
  TradeTicket, Gift, FastBreak (Run/Lineup/Result):** o game loop (seções 5–9).

## 4. Modelo de dados (Prisma) — implemente integralmente

> Esqueleto. Complete relações inversas e índices. Tudo monetário em centavos (Int).

```prisma
enum Tier { COMUM TORCIDA RARO LENDARIO GALACTICO }
enum EditionType { CIRCULANTE LIMITADA }
enum ChallengeType { STANDARD FLASH CRAFTING }
enum TxType { MINT BUY SELL OFFER_ACCEPT REWARD BURN GIFT FASTBREAK_REWARD }
enum ListingStatus { ACTIVE SOLD CANCELLED }

model User {
  id String @id @default(cuid())
  email String @unique
  username String @unique
  passwordHash String
  balanceCents Int @default(50000)         // R$ 500 boas-vindas
  topShotScore Int @default(0)             // soma dinâmica dos Moments (Pontuação wefans)
  collectorScore Int @default(0)           // recalculado por snapshot
  tradeTickets Int @default(0)
  isAdmin Boolean @default(false)
  createdAt DateTime @default(now())
}

model Series { id String @id @default(cuid()) name String season String startsAt DateTime endsAt DateTime }
model Player { id String @id @default(cuid()) name String club String position String jersey Int nationality String }

model Template {
  id String @id @default(cuid())
  playerId String
  seriesId String
  setId String?
  title String
  playType String
  competition String
  matchDate DateTime
  videoUrl String?
  trajectory String?           // path SVG da jogada
  tier Tier
  editionType EditionType
  editionSize Int?             // null se CIRCULANTE (aberta)
  mintedCount Int @default(0)
  circulatingCount Int @default(0)   // mintados - queimados
  badges String[] @default([])
  aspCents Int @default(0)     // preço médio de venda
}

model Moment {
  id String @id @default(cuid())
  templateId String
  serial Int
  ownerId String?
  topShotScore Int @default(0)
  locked Boolean @default(false)
  lockedUntil DateTime?
  tempLockUntil DateTime?      // trava temporária de leaderboard
  burned Boolean @default(false)
  acquiredPriceCents Int @default(0)
  mintedAt DateTime @default(now())
  @@unique([templateId, serial])
}

model Set { id String @id @default(cuid()) seriesId String name String description String }
model Pack {
  id String @id @default(cuid())
  name String
  dropId String?
  priceCents Int
  momentCount Int @default(3)
  oddsJson Json                // { COMUM:.6, TORCIDA:.2, RARO:.15, LENDARIO:.045, GALACTICO:.005 }
  guaranteeTier Tier?          // garante ao menos 1 deste tier ou acima
  totalSupply Int
  soldCount Int @default(0)
  sealed Boolean @default(false)  // pacote lacrado revendível no Mercado de Pacotes
}
model PackInventory {          // pacote lacrado que um usuário possui (revendível)
  id String @id @default(cuid()) packId String ownerId String opened Boolean @default(false)
}

model Drop {
  id String @id @default(cuid())
  name String
  waitingRoomOpensAt DateTime
  startsAt DateTime
  endsAt DateTime
  requiredCollectorScore Int @default(0)
  hasRebound Boolean @default(false)
  status String @default("SCHEDULED") // SCHEDULED|WAITING|LIVE|ENDED
}
model QueueEntry {
  id String @id @default(cuid()) dropId String userId String position Int
  windowStartsAt DateTime? purchased Boolean @default(false)
  @@unique([dropId,userId])
}

model Listing { id String @id @default(cuid()) momentId String @unique sellerId String priceCents Int status ListingStatus @default(ACTIVE) createdAt DateTime @default(now()) }
model Offer { id String @id @default(cuid()) momentId String? templateId String? buyerId String priceCents Int status String @default("ACTIVE") expiresAt DateTime? }
model Transaction { id String @id @default(cuid()) type TxType momentId String buyerId String? sellerId String? amountCents Int @default(0) feeCents Int @default(0) createdAt DateTime @default(now()) }

model Showcase { id String @id @default(cuid()) ownerId String name String description String public Boolean @default(true) }
model ShowcaseItem { id String @id @default(cuid()) showcaseId String momentId String order Int }

model Challenge {
  id String @id @default(cuid())
  type ChallengeType
  name String description String
  startsAt DateTime endsAt DateTime
  rewardTemplateId String?
  rewardPackId String?
  requiredTemplateIds String[] @default([])  // STANDARD/CRAFTING: o que coletar/forjar
  burnOnComplete Boolean @default(false)     // CRAFTING queima a entrada
  flashRuleJson Json?                        // FLASH: critério baseado em stats simuladas
}
model ChallengeEntry { id String @id @default(cuid()) challengeId String userId String momentIds String[] completedAt DateTime? }

model Quest { id String @id @default(cuid()) name String description String criteriaJson Json rewardTemplateId String? startsAt DateTime endsAt DateTime }

model Leaderboard {
  id String @id @default(cuid())
  kind String           // TEAM | PLAYER
  refKey String         // clube ou playerId
  name String
  snapshotAt DateTime?
  rewardsJson Json?
}
model LeaderboardEntry { id String @id @default(cuid()) leaderboardId String userId String points Int @default(0) rank Int? }
model Checklist { id String @id @default(cuid()) name String kind String requiredTemplateIds String[] bonusPoints Int }

model FastBreakRun {
  id String @id @default(cuid())
  name String startsAt DateTime endsAt DateTime
  lineupSize Int @default(5)
  survivor Boolean @default(false)
}
model FastBreakDay {
  id String @id @default(cuid()) runId String dayNumber Int gameDate DateTime
  statKey String        // gols, assistencias, defesas, desarmes...
  targetScore Int
}
model FastBreakLineup {
  id String @id @default(cuid()) dayId String userId String captainMomentId String?
  momentIds String[]    // Moments dos jogadores escalados
  score Int @default(0) won Boolean @default(false) submittedAt DateTime @default(now())
}
model MomentUsage { id String @id @default(cuid()) runId String userId String playerId String used Int @default(0) } // fadiga
```

## 5. Páginas / rotas (espelham a navegação do Top Shot)

- `/` — Home: Drop ativo, pacotes, coleções em destaque, chamada para Pelada/Desafios.
- **Drops:** `/drops`, `/drop/[id]` (sala de espera → fila → janela de compra), rebound.
- **Abrir:** `/abrir/[packInventoryId]` (revelação animada).
- **Coleção:** `/colecao` (filtros: raridade, série, set, jogador, edição), `/momento/[id]`
  (serial, score, procedência, ações: vender/ofertar/travar/queimar/presentear/vitrine).
- **Mercado:** `/mercado` (Buy Now, floor por template, ASP, Pricing Helper, indicador
  "À venda"), `/mercado/pacotes` (pacotes lacrados), `/ofertas` (minhas ofertas).
- **Aba Jogar (Play):** `/jogar/pelada` (Fast Break), `/jogar/rankings` (Leaderboards),
  `/jogar/desafios` (Challenges + Builder), `/jogar/missoes` (Quests), `/jogar/checklists`.
- **Vitrines:** `/vitrines`, `/vitrine/[id]` (públicas), `/u/[username]` (perfil público).
- **Perfil/carteira:** `/perfil` (Pontuação wefans, Score do Colecionador, fichas,
  histórico, depósito, fichas de troca).
- **Admin:** `/admin/*` (seção 10).

API/server actions: auth, drop (join/queue/buy), pack (open, list/buy lacrado),
listing (create/cancel/buy), offer (make/accept/cancel), moment (lock/burn/gift),
challenge (entry/complete), quest (claim), showcase (crud), wallet (deposit),
tradeticket (redeem), fastbreak (lineup/submit/score), leaderboard (lock/snapshot).

## 6. Regras de negócio (o coração — tudo em transação atômica)

1. **Tiragem por raridade** (sugestão): COMUM aberta (circulante) ou 8k–15k · TORCIDA
   3k–8k · RARO 250–750 · LENDARIO 25–99 · GALACTICO 3–9.
2. **Mint:** para cada slot, sorteie tier por `oddsJson`; se `guaranteeTier` e nenhum
   slot atingiu, force o último. Escolha Template do tier com tiragem disponível
   (CIRCULANTE sempre disponível). Incremente `mintedCount`/`circulatingCount`, crie
   `Moment serial=mintedCount`, dono=usuário. **Atômico** (`$transaction`) p/ não duplicar serial.
3. **Pontuação wefans (Top Shot Score):** por Moment = `acquiredPriceCents/100 * 10`.
   **Dinâmica:** ao trocar de dono, recalcula = `max(preço pago, asp) /100 *10`.
   `User.topShotScore` = soma dos Moments possuídos (não conta pacote lacrado).
4. **Score do Colecionador:** pontos fixos por Moment conforme tier (ex.: COMUM 18,
   TORCIDA 15, RARO 120, LENDARIO 1500, GALACTICO 5000) + bônus por recompensa de
   challenge e por checklist. Recalculado em snapshot. Usado p/ requisito de fila de drop.
5. **Drop + fila:** sala de espera abre em `waitingRoomOpensAt`; ao iniciar, posições da
   fila são **aleatórias** entre os inscritos elegíveis (`collectorScore >= requiredCollectorScore`
   ou allowlist). Cada posição recebe **janela de 20 min** para comprar. Quem não pega
   número baixo o suficiente pode comprar **rebound packs** se `hasRebound`.
6. **Mercado:** Buy Now a preço fixo; comprar transfere dono, debita comprador, credita
   vendedor **menos taxa 5%**, registra `Transaction(BUY)`, **atualiza `asp` do Template**
   (média móvel) e recalcula scores dos dois. Não comprar próprio listing. Travado/queimado/
   lacrado não lista. Indicador "À venda" na coleção. **Revisão anti-anômalo:** se preço
   > 3× ASP, marcar `Transaction` para revisão e exibir aviso (Conduta).
7. **Offers:** ofertar em Moment específico ou em qualquer Moment de um Template; aceitar
   executa a transferência como uma venda.
8. **Lock:** trava por 1 ano (`lockedUntil`); não vende/transfere/queima/presenteia/forja.
   Trava temporária (`tempLockUntil`) para submissão em leaderboard.
9. **Burn:** `burned=true`, `ownerId=null`, decrementa `circulatingCount` (mantém
   `mintedCount` histórico). Base de Crafting Challenges.
10. **Challenges:**
    - **STANDARD:** possuir (ou travar) ≥1 Moment de cada `requiredTemplateIds` na janela
      → recompensa (mint de `rewardTemplate`/`rewardPack`).
    - **CRAFTING:** submeter Moments no Builder; ao completar, **queima** a entrada e dá
      a recompensa.
    - **FLASH:** critério em `flashRuleJson` avaliado contra stats simuladas do jogo
      (ex.: "tenha o Lance de um jogador que marcar hoje").
11. **Quests:** critério em `criteriaJson` (ex.: montar showcase com jogadores de N
    competições diferentes) → recompensa.
12. **Leaderboards:** sobe **travando** Moments — soma os pontos (Pontuação wefans) dos
    Moments travados no leaderboard do time/jogador correspondente. Snapshot encerra e
    distribui `rewardsJson`. Checklists completos dão `bonusPoints` ao score do time.
13. **Trade Tickets:** cada Moment → 1 ficha (consome/queima o Moment). Fichas trocam por
    pacotes exclusivos marcados como `ticketOnly`.
14. **Gifting:** transfere dono sem pagamento; registra `Transaction(GIFT)`; recalcula scores.
15. **Fast Break (Pelada):** por `FastBreakDay`, o usuário escala `lineupSize` Moments de
    **jogadores distintos** que possui; opcional **captain** (multiplicador no score).
    **Fadiga:** quantas vezes um jogador pode ser usado no run depende do **ASP** do Moment
    (mais valioso → mais usos); o sistema prioriza o Moment com mais usos disponíveis.
    Ao final do dia, calcula `score` (stats simuladas) vs `targetScore` → `won`.
    Leaderboard **diário** (maior score) e do **run** (mais vitórias). Recompensas em
    pacotes por marcos de vitórias; modo **survivor** elimina quem perde.
16. **CC vs LE:** Circulante mostra contagem circulante; Limitada mostra `#serial/editionSize`.

## 7. Seed (100% fictício) — `prisma/seed.ts`

1 Temporada ativa; ~14 Players fictícios (clubes/ligas inventados); ~60 Templates nos 5
tiers, misturando edições Circulante e Limitada, com `trajectory` SVG e selos; 3 Coleções;
1 Drop ativo com 1 Pack (R$ 40, 3 lances, com fila e rebound) + 1 pacote `ticketOnly`;
2 Challenges (1 STANDARD, 1 CRAFTING) + 1 Quest; 2 Leaderboards (1 time, 1 jogador) +
1 Checklist; 1 FastBreakRun de 7 dias com stats simuladas; usuário admin
(`admin@wefans.test`) e usuário comum de teste com alguns Moments.

## 8. Motor de partidas simulado (substitui o "jogo ao vivo" do Top Shot)

Como não há dados reais, crie `lib/matchSim.ts`: gera, de forma determinística por data,
boxscores fictícios por jogador (gols, assistências, defesas, desarmes, nota). É a fonte
de verdade para **Flash Challenges** e **Fast Break**. Um job de cron "fecha" o dia e
calcula resultados. Deixe os números reproduzíveis (seed por `gameDate`).

## 9. Qualidade / não-funcionais

TypeScript estrito; **Zod** em toda entrada; transações atômicas em mint, compra de
pacote, compra/oferta no mercado, conclusão de challenge, submissão de leaderboard e
cálculo de Fast Break (sem race de serial/saldo/uso). Estados vazios e de erro úteis.
Responsivo mobile-first; acessível (foco por teclado, `prefers-reduced-motion`). Testes
para: mint, compra com taxa+ASP+score, lock/burn, conclusão de challenge, fadiga e
pontuação do Fast Break, geração de fila de drop. `README.md` com setup completo.

## 10. Admin (zona administrativa da web) — liberação de conteúdo por parceria ⭐

> **Princípio:** o conteúdo (Lances/figurinhas) é cadastrado e **liberado conforme você
> fecha parceria com cada time**. Nada nasce visível: você prepara tudo em rascunho e
> "vira a chave" quando a parceria é anunciada. Toda essa operação acontece aqui, na web.

### 10.1 Ciclo de publicação (estado, não exclusão)
Todo **Team, Series, Set e Template** tem um campo `status`:
`RASCUNHO` (cadastrado, invisível ao público) → `AGENDADO` (`publishAt` no futuro; vai ao
ar sozinho na data) → `PUBLICADO` (visível e mintável) → `ENCERRADO` (não minta mais,
permanece colecionável/negociável). Adicione `publishAt DateTime?` e `status` nesses
modelos. **Regra de visibilidade:** as queries públicas (catálogo, mercado, pacotes, abrir
pacote, check-in) só enxergam conteúdo `PUBLICADO`. Conteúdo em rascunho/agendado é
invisível mesmo que exista no banco. Um job (cron) promove `AGENDADO → PUBLICADO` no horário.

### 10.2 O time é a unidade de parceria
`Team` ganha `partnerStatus` (`PROSPECT` | `ATIVO` | `PAUSADO` | `ENCERRADO`) e vira o eixo
do conteúdo: cada time tem suas Coleções, Lances, jogadores e **pacote(s)**. Vincular
Templates ao `teamId`. **Liberar um time** = publicar o time + suas coleções/Lances + o
pacote dele numa ação. Pausar uma parceria oculta o conteúdo do time das telas públicas
sem apagar nada (Lances já mintados continuam na carteira dos usuários e no mercado).

### 10.3 Fluxo "Onboard de time parceiro" (assistente passo a passo)
Uma tela que guia: (1) criar/editar `Team` + `Stadium` (pro check-in); (2) criar a
`Series/Set` da parceria; (3) cadastrar Players e Templates (tier, edição CC/LE, tiragem,
selos, trajetória, vídeo placeholder) em lote; (4) montar o `Pack` (preço, odds, garantia);
(5) **pré-visualizar** como o público verá; (6) **Publicar agora** ou **Agendar** (define
`publishAt`). Botão único de "Liberar parceria" executa a publicação em transação.

### 10.4 Demais CRUDs e operações
CRUD de Series, Sets, Players, Templates, Packs, **Teams/Stadiums/Fixtures** (pro check-in),
Drops (janela, fila, score exigido, rebound, allowlist), Challenges (3 tipos), Quests,
Leaderboards, Checklists, FastBreak Runs/Days. **Fila de revisão de fraude do check-in**
(aprovar/rejeitar `REVIEW`). Métricas (mintados, vendas, taxa arrecadada, scores,
check-ins por jogo). Botões: liberar/pausar parceria, gerar fila de um drop, rodar snapshot
de leaderboard, fechar dia de Fast Break, mint de cortesia. Tudo protegido por `isAdmin`
e com **log de auditoria** (quem publicou o quê e quando).

### 10.5 No MVP
O admin do MVP precisa só de: **CRUD de Team (com parceria) + Stadium + Fixture**, cadastro
de **Players/Templates/Pack** com o **ciclo Rascunho → Publicar/Agendar**, e a **fila de
revisão do check-in**. O resto do admin acompanha as fases v2.

## 11. Layout & Design (estrutura igual à do NBA Top Shot)

**Princípio:** replique a **gramática de layout e os padrões de UX do Top Shot**
(navegação, grades, filtros, anatomia da carta, medidores, feeds) **página por página**.
**Marca própria:** logo, paleta e fontes são do wefans — **não** copie logo, fontes nem
artes da NBA/Top Shot (marcas registradas). Tema **escuro**, denso, card-driven, com
acento de cor — mesma família visual, identidade própria.

### 11.1 Tokens de marca (wefans) — paleta "Miami underground"
Inspiração: GTA VI / Vice City + Inter Miami — **preto, rosa-choque neon**, com violeta
e ciano de apoio. Vibe noturna, urbana, mais underground (menos brilho corporativo,
glow de neon sobre preto, grão/textura sutil).
```
--bg:#0a0610  --panel:#15101c  --panel2:#1c1426
--ink:#f6eef3  --muted:#9a8aa6  --line:rgba(255,255,255,.07)
--accent:#ff2e88   (rosa-choque, assinatura)
--accent2:#9d4edd  (violeta neon)
--accent3:#21d4e0  (ciano neon)
--sunset: linear-gradient(120deg,#ff2e88,#9d4edd,#3a1e6e)  (hero / foil dos raros)
Prancheta de tática: fundo quase preto (#170b22) com linhas de giz NEON (ciano #21d4e0
e rosa #ff2e88) e glow magenta; bola com rastro neon.
Tiers: COMUM #8b8194 · TORCIDA #21d4e0 · RARO #9d4edd · LENDARIO #ff9e2c · GALACTICO #ff2e88
Fontes: Anton (display; logo com efeito chrome/airbrush) · Outfit (texto) · Space Mono (série)
Fundo ambiente: glows radiais rosa/violeta/ciano fixos + vinheta, para o ar de noite Miami.
```
Estética das cartas: prancheta de tática **neon sobre preto**, foil holográfico
(gradiente sunset) animado em Lendário/Galáctico, número de camisa em marca d'água, bola
percorrendo a trajetória com rastro neon (`offset-path` com `trajectory`). Tenho um
protótipo HTML (`wefans.html`) **já nessa paleta** — use como referência de aparência.

### 11.2 Estrutura global (igual ao Top Shot)
- **Top bar fixa, full-width, fundo escuro:** logo à esquerda; nav central
  **Marketplace · Sets · Play · Showcases**; busca; à direita avatar + **saldo da
  carteira** + **Pontuação wefans** (clicável → dropdown do perfil).
- **Sub-nav contextual** por área (ex.: dentro de Play → Pelada / Rankings / Desafios /
  Missões / Checklists).
- **Footer** com links institucionais e Conduta.
- Layout de conteúdo: **grade de cards** como unidade dominante em quase toda tela.

### 11.3 Página inicial (igual à home do Top Shot)
1. **Hero do Drop ativo** (arte grande + contador + CTA "Entrar no drop").
2. Faixa de **packs/coleções em destaque** (cards horizontais).
3. **Feed de vendas ao vivo do Mercado** (componente assinatura do Top Shot): lista em
   tempo real com Lance, preço, **número de série**, set, série, comprador, vendedor,
   data/hora. Atualiza por SSE/polling. Inclua também página dedicada `/mercado/atividade`.
4. Destaques de Desafios/Rankings.

### 11.4 Marketplace (igual ao do Top Shot)
- **Rail de filtros à esquerda** (sticky): série, set, tier, jogador, clube, preço,
  faixa de série (low serial), edição (Circulante/Limitada), à venda/com oferta.
- **Grade de cards** à direita com ordenação (preço, ASP, série, recém-listado).
- Cada card do mercado: mídia do Lance, tier, **floor price**, **ASP**, e sob o nome o
  indicador **Circulante (contagem)** ou **Limitada (#/N)** — equivalente ao "CC/LE".
- **Pricing Helper** ao listar (mostra vendas recentes daquele Template).
- Aba irmã `/mercado/pacotes` para **pacotes lacrados** (mesma grade).

### 11.5 Detalhe do Lance (igual à Moment page do Top Shot)
- Mídia grande à esquerda (vídeo placeholder / cena animada da jogada).
- Painel à direita: título, jogador, série/set, tier, **#serial/N**, selos, preço/ASP,
  e impacto na **Pontuação wefans** ao comprar/vender (mostre o delta, como o Top Shot).
- **Medidor semicircular de propriedade** (componente assinatura): distribuição dos
  exemplares — em posse, **listados**, **queimados**, e em "Vestiário" (Locker
  Room/Trade Tickets). Replique esse gauge.
- Ações: Comprar / Fazer Oferta / Vender / Travar / Queimar / Presentear / Add à Vitrine.
- **Procedência:** timeline de donos e transações.

### 11.6 Pack Details + Drop/Fila (igual ao Top Shot)
- **Pack Details Page:** mostra **todos os Lances possíveis** no pacote, agrupados e
  ordenáveis por tier, em formato interativo (assista cada Lance antes de entrar na fila).
- **Sala de espera → Fila → Janela de compra (20 min):** telas dedicadas com posição na
  fila, status e contador, igual ao fluxo de drop do Top Shot. Tela de **rebound packs**.

### 11.7 Abertura de pacote + 3D Moment (efeito igual ao Top Shot) ⭐
**Figurinha = cubo 3D.** Cada Lance é renderizado como um **cubo/slab 3D** com **moldura
neon** (cor pela raridade) que gira em perspectiva e **revela faces diferentes**, igual ao
"3D Moment" do Top Shot. Faces: **frente** = o lance (vídeo placeholder + UI de transmissão:
tempo, placar, sobrenome) · **lateral** = **escudo holográfico** (brilho metálico) ·
**outra lateral** = painel de stats (tipo de jogada, data, **#série**) · **verso** = marca
wefans + "prova de presença". Interação: **arraste para girar**, auto-rotação no idle.
- **Web:** **Three.js / WebGL** (BoxGeometry com texturas por face via CanvasTexture; moldura
  = 12 barras emissivas; sem post-processing pesado — glow fake por cor + fundo radial).
  Existe um **protótipo pronto**: `wefans_3d_moment.html` — use como referência/base.
- **Sequência de abrir pacote:** rasgar → cada Lance **materializa como cubo 3D girando**
  (escala 0→1 + giro extra) → **flash de refletor** em Lendário/Galáctico → resumo
  "adicionar à coleção".

### 11.7.1 3D Moment no app Flutter
Para o efeito ficar **idêntico** sem reescrever em Dart, a recomendação é **reusar o mesmo
componente WebGL**: empacote o card 3D (Three.js) como uma página standalone e **embuta via
WebView** (`flutter_inappwebview`), passando os dados do Moment por query/postMessage. Assim
web e app compartilham exatamente o mesmo render. *Alternativa nativa* (se a performance/UX
do WebView não bastar): renderizar em 3D nativo com `flutter_scene`/Impeller ou um port Dart
de three (`three_js`), carregando o card como **glTF** + texturas de face. Decida no
`DECISIONS.md`; o backend não muda em nenhum dos casos (só serve dados + URLs de vídeo/textura).

### 11.8 Coleção / Perfil (igual ao Top Shot)
- **Overview** do perfil: Pontuação wefans, Score do Colecionador, nº de Lances,
  **histórico de pacotes abertos**, fichas de troca, saldo.
- **Grade da coleção** com os mesmos filtros do mercado; badge **"À venda"** sobre
  Lances listados; indicador de **travado**.
- Perfil público `/u/[username]` com Vitrines e estatísticas.

### 11.9 Play hub (igual ao Top Shot)
- **Desafios (Challenge Hub):** cards de desafios **Ativos / Anteriores / Concluídos**,
  cada um com recompensa, tempo restante e **barra de progresso**; **Montador de Entrada**
  (Challenge Builder) para selecionar/forjar os Lances exigidos, com feedback de
  elegibilidade.
- **Rankings (Leaderboards):** tabelas por Time e Jogador, com sua posição, pontos
  (travados) e prêmios; fluxo de **travar Lance** para pontuar.
- **Pelada (Fast Break):** montagem de lineup por rodada (slots de jogador, tag de
  **captain**, indicadores de **fadiga/usos**), placar-alvo do dia, leaderboards
  diário e do run.
- **Missões (Quests)** e **Checklists** com progresso visual.

### 11.10 Vitrines (Showcases)
Editor de álbum (arrastar Lances, capa, título, descrição, público/privado) e página de
exibição pública em grade — equivalente aos Showcases do Top Shot.

### 11.11 Qualidade visual
Responsivo mobile-first (a top bar vira menu; rail de filtros vira drawer); foco visível
por teclado; `prefers-reduced-motion` desliga as animações de pacote/foil; skeletons de
carregamento nas grades; estados vazios que convidam à ação.

### 11.12 Referência de telas (layout igual ao Top Shot — só a estrutura, marca é wefans)
Padrões extraídos das telas reais do Top Shot. Reproduza a **gramática de layout**; use
conteúdo fictício e a marca wefans.

**(a) Top bar (todas as telas):** logo à esquerda + tag "BETA"; nav central com ícone+texto
**Explore · Drops · Mercado · Jogar(badge ex. "PLAYOFFS") · Coleção** (item ativo com
sublinhado neon); à direita **carteira/token, busca (lupa), notificações (sino), avatar**.
Footer escuro com "Comunidade" (redes), Suporte, Sobre, Legal + selos e badges de loja
(Play Store / App Store) — o app é divulgado no rodapé da web.

**(b) Perfil / Coleção (img 1):** faixa de "pinned Moments" no topo (vazia → CTA "Obter
Moments"); linha de identidade (avatar, @usuario, endereço/handle, data de entrada, botões
editar/pin); **3 widgets de KPI** à direita: **Pontuação wefans · Sets Completos · Nº de
Lances**. Sub-abas: **OVERVIEW · MOMENTS · PACOTES · SETS · RANKINGS · TIMES · VITRINES ·
WISHLIST** (adicione **Wishlist/Lista de desejos** ao produto). No OVERVIEW: card "monte
seu perfil" (widgets editáveis) + **"Collection overview by Times"** e **"por Tiers e
Série"** (cada um com estado vazio → CTA Mercado); coluna direita com **feed de atividade
global** do usuário.

**(c) Feed de atividade / Live (img 2):** **rail esquerdo** com "Perto de completar"
(sets quase prontos) e "Minha Wishlist"; **feed central** de vendas: cada linha = card do
Lance + **preço em destaque** + etiqueta do set/tipo + timestamp; banners promocionais
intercalados (sets em campanha). Filtros no topo do feed. É a versão "stream" do mercado.

**(d) Detalhe do Lance (img 3) — anatomia completa:**
- Breadcrumb de tags (ex.: Temporada · Time · Jogador).
- **Coluna esquerda:** tira de **thumbnails** (frente com ▶, e as faces/ângulos do 3D).
- **Centro:** mídia grande (o 3D Moment / vídeo) com botões de áudio e fullscreen.
- **Coluna direita (painel de compra):** tier + **#/N**, nome, tipo+data, descrição curta;
  seletor de **Parallels** (variантes visuais da edição); **"Menor preço" (Lowest ask)** +
  **"Selecionar e comprar"**, **"Fazer oferta"**, **"Analytics"**; "X à venda · preço médio".
- **DETALHES** (colapsável): texto do lance.
- **Medidor semicircular de propriedade** com **6 estados** e contagem: **Não listados ·
  À venda · Travados · Escondidos em pacotes · Queimados · Oferta supply existente**; link
  "ver todos os Moments da edição"; "atualiza a cada 2 min".
- **Histórico de vendas:** **Top Purchases** (com "#1/#2/#3 TOP SALE", serial, parallel,
  data, link TX) + **Recent Purchases** (tabela: comprador, preço, serial, série, parallel,
  data/hora, TX) + "ver histórico completo".
- **Highlight Stats** e **Player Stats** (colapsáveis).
- **Top Collectors:** ranking "Most Owned" + painel de **Special Serials** (#1, #1000…) com dono.
- **Top Offers:** abas **Edition · Serial · Parallel**; lista de ofertas (autor, valor, quando)
  + "Criar oferta" / "Ver todas".
- **More Moments:** carrossel de cards 3D relacionados (Burned · Supply · Lowest Ask · Avg Sale).

**(e) Mercado (img 4):**
- Título "MARKETPLACE" + sub-abas **EXPLORE · MOMENTS · LIVE LISTINGS · PACKS · LATEST
  PURCHASES · TOP PURCHASES · VIP · BARGAIN BIN**.
- Carrossel **"Collect and Earn"** no topo: cards de campanhas/sets (arte, preço "to
  collect", botão Shop/Win) + link "How rewards work".
- **Barra de filtros:** ícone de filtros, busca "por jogadores, times e sets", **chips
  rápidos** (Ultimates · Legendaries · Rares · Estreias · Autographs), ordenação
  (**SALES 24H / DESC**), **"Select floor gap"**, toggles de **densidade** e **grade/lista**.
- **Grade de cards 3D:** cada card = mini 3D Moment + tier + **/N (LE)** ou circulante +
  nome + descrição do lance + **Burned · Supply** + **Lowest Ask** e **Avg Sale**; ícone
  de wishlist (marcador) no canto. (Cards mostram o slab 3D em leve perspectiva, exatamente
  como o nosso `wefans_3d_moment.html`.)

**(f) Drops (img 5):**
- Placar ao vivo no topo (mini scoreboard do jogo).
- **Hero** do drop (arte grande).
- **Cards de pacote:** nome, descrição, **Supply / Remaining**, seletor de quantidade +
  **"Comprar R$X"**; selos **"% Reserved / Nx oversubscribed"**, **"SOLD OUT"**, "Under X% Left".
- **"Ganhe agora · Trade-In to Win":** carrossel de **leilões** (item, "N items to win",
  requisito de entrada, contador "Trade-in ends in", "Ver leilão") — casa com nossos
  **Trade Tickets / burn-to-earn**.
- **"Rip Packs 24/7":** pacotes always-on (o loop de abrir a qualquer hora).
- **"Ganhe prêmios · Daily" com "Live Now":** cartelas do **Fast Break (Pelada)** por
  liga/categoria, botão "Jogar agora".

### 11.13 Conceitos novos destas telas (adicionar ao produto/modelo)
- **Wishlist / Lista de desejos:** usuário marca Templates que quer; vira aba no perfil e
  filtro no feed ("perto de completar"). Modelo: `Wishlist { userId, templateId }` +
  ícone de marcador nos cards do mercado.
- **Parallels:** variantes visuais de uma mesma edição (ex.: "Base", "Hardcourt",
  "Blockchain"). Modelo: `parallel String @default("BASE")` no `Template`/`Moment`, com
  seletor no detalhe do Lance e coluna "Parallel" no histórico/ofertas.
- **Analytics do Lance, Special Serials, "escondidos em pacotes" e "não listados"** já
  saem naturalmente do modelo (Transactions + estados do Moment); só exponha nas telas
  conforme a anatomia do item (d).

## 12. Plano de build (faça em fases; commit + atualize PARITY.md ao fim de cada uma)

> **⭐ Fronteira de MVP (Produto v1) — construa e lance ISTO primeiro:**
> **Fases 0 → 4 + Fase CK (check-in).** Ou seja: fundação **API-first** + auth
> (cookie web **e** token app) + carteira + pacote/mint + coleção + **check-in por
> geolocalização** + mercado simples + 1 tipo de desafio. Isso já entrega o app com o
> **diferencial real (prova de presença)** rodando sobre uma economia validada na web.
> **Tudo de Fase 5 em diante é v2** (Ofertas, Drops com fila, Showcases, Quests, Trade
> Tickets, Leaderboards, Flash Challenges, Fast Break). Não construa v2 antes do MVP no ar.

- **Fase 0 — Fundação API-first (monorepo).** Crie a estrutura `backend/` + `frontend/`
  + scripts raiz (seção 1.1) + `docker-compose.yml` (Postgres) + `dev.sh`. **backend:**
  Fastify+TS+Prisma+Zod, schema (seções 4 + A2.3) + migrate + `seed.ts` (seções 7 + A2.5),
  **camada de serviço `backend/src/services`** e esqueleto `/api/v1` com healthcheck.
  **frontend:** Next+TS+Tailwind com um cliente de API e uma tela ligando no healthcheck.
  `.env.example` em cada pasta, README. ✅ `npm run setup && npm run dev` sobe backend
  (`:4000`) e frontend (`:3000`) juntos; seed roda; frontend lê algo do `/api/v1`.
- **Fase 1 — Auth (web+app) + Carteira.** Cadastro/login; **cookie p/ web E JWT+refresh
  p/ app** com `getAuthContext` único (seção A1); saldo, depósito simulado, perfil base,
  **escolher time seguido** (`favoriteTeamId`). ✅ login web por cookie e por token funcionam.
- **Fase 2 — Catálogo + Pacotes + Mint + Lances.** Tiers, edições CC/LE, selos, abrir
  pacote com mint atômico e revelação. **Serviço `mint` reutilizável** (web, API e check-in
  usam o mesmo). ✅ sem serial duplicado sob concorrência.
- **Fase 3 — Coleção + Procedência + Perfil.** Grid/filtros, detalhe do Moment, histórico.
- **Fase 4 — Mercado + Scores.** Buy Now, listar/deslistar, taxa, floor, ASP, Pricing
  Helper, Pontuação wefans dinâmica, revisão anti-anômalo. ✅ compra ajusta saldos, ASP e score.
- **Fase CK — Check-in por geolocalização (app).** ⭐ Teams/Stadiums/Fixtures, nonce,
  geofence haversine, **device attestation** (Play Integrity / App Attest), sinais de mock,
  unicidade por jogo, fila de revisão de fraude; em check-in VALID **minta o pacote** via o
  serviço de mint. Endpoints da seção A2.4. ✅ check-in dentro do raio+janela dá pacote;
  fora do raio / fora da janela / mock / atestado inválido **não** dá; nunca duplica por jogo.
  *(Esta fase fecha o MVP.)*
- **Fase 5 — Ofertas, Lock, Burn, Gift, Desafios (Standard/Crafting) + Builder.**
- **Fase 6 — Drops com fila + Collector Score + Rebound + Mercado de Pacotes.**
  ✅ fila randômica, janela 20min, requisito de score.
- **Fase 7 — Showcases, Quests, Trade Tickets.**
- **Fase 8 — Leaderboards + Checklists + Flash Challenges + motor de simulação.**
  ✅ travar Moment pontua no ranking; snapshot distribui prêmios.
- **Fase 9 — Fast Break (Pelada): runs, lineups, captain, fadiga por ASP, daily/run
  leaderboards, survivor, recompensas.**
- **Fase 10 — Admin completo + métricas + jobs (cron).**
- **Fase 11 — Polimento.** Design (seção 11), responsivo, acessibilidade, testes (seção 9).
- **Fase 12 — Hardening.** Rate limit, logs, revisão de transações monetárias, Conduta.
- **Fase 13 (opcional) — On-chain.** Abstrair `OwnershipProvider` (impl `DbOwnership` na
  v1); plugar mint/transfer em blockchain (Flow ou L2 EVM) + saque para wallet, sem
  reescrever o resto. Resgate físico fica como stub.

---

### Como começar
1. Confirme a stack (seção 1) ou ajuste no `DECISIONS.md`.
2. Execute a Fase 0 inteira e me mostre schema + seed rodando antes de seguir.
3. A cada fase: implemente → teste → commit claro → marque os itens no `PARITY.md` →
   resuma o que mudou.
