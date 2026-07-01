# PARITY.md — paridade Top Shot → wefans

> Marque cada item conforme entrega. Legenda: ⬜ pendente · 🟨 parcial (modelado/parcial) · ✅ pronto.

## Fronteira de MVP (v1): Fases 0 → 4 + Fase CK

## Fase 0 — Fundação API-first (aceite)
- [x] Monorepo `backend/` + `frontend/` + scripts raiz (workspaces + concurrently)
- [x] `docker-compose.yml` (Postgres) + `dev.sh` + `scripts/db-up.sh` (fallback local)
- [x] backend Fastify + TS + Prisma + Zod; `.env.example`
- [x] Schema Prisma completo (seções 4 + A2.3 + 10.1 + 11.13) + migração `init`
- [x] `seed.ts` (seções 7 + A2.5) roda e popula
- [x] Camada de serviço `backend/src/services` (estrutura + `system`/`context`)
- [x] `/api/v1` com healthcheck + `/system/stats`
- [x] frontend Next + TS + Tailwind com cliente de API lendo o healthcheck
- [x] `npm run setup && npm run dev` sobe `:4000` e `:3000`; seed roda; frontend lê `/api/v1`

## Fase 1 — Auth (web+app) + Carteira (aceite)
- [x] Cadastro/login; **cookie httpOnly (web)** E **JWT access + refresh rotativo (app)**
- [x] Resolvedor único `getAuthContext` (aceita cookie OU bearer) → `userId`
- [x] Envelope de erro consistente; DTOs (sem expor modelos Prisma)
- [x] Carteira: saldo + **depósito simulado** via adaptador `PaymentProvider`/`FakeWallet`
- [x] Perfil base + **escolher time seguido** (`favoriteTeamId`, só times PUBLICADO)
- [x] ✅ login web por **cookie** e por **token** funcionam (17/17 testes de integração)
- [x] Web: página `/entrar` (login+cadastro) e `/perfil` (KPIs, depósito, time, histórico, sair)

## Fase 2 — Catálogo + Pacotes + Mint + Lances (aceite)
- [x] Serviço de **mint reutilizável** (`services/mint.ts`) — usado por packs e (futuro) check-in
- [x] Sorteio ponderado por `oddsJson`, garantia de tier, fallback quando edição esgota
- [x] ✅ **sem serial duplicado sob concorrência** — `UPDATE ... RETURNING` atômico +
  retry em deadlock (40P01). Validado: 20 aberturas concorrentes, 0 duplicados/inconsistências/estouros
- [x] Comprar pacote (débito atômico, sem overspend) → `PackInventory` → abrir → revelação
- [x] Catálogo público (só PUBLICADO): séries, sets, templates, detalhe da edição
- [x] Coleção do usuário + detalhe do Momento (serial, ASP, propriedade)
- [x] Web: `/pacotes`, `/pacote/[id]` (Lances possíveis por tier), `/abrir/[id]` (revelação),
  `/colecao`, `/momento/[id]`, `/lance/[id]`, `/explorar`; carta do Lance (prancheta neon 2D)

## Fase 3 — Coleção + Procedência + Perfil (aceite)
- [x] **Procedência**: linha do tempo de transações no Momento (`MINT` gravado; BUY/SELL na Fase 4)
- [x] **Perfil** enriquecido: nº de Lances, distribuição por tier, histórico de pacotes abertos
- [x] **Perfil público** `/u/[username]` (scores + coleção; não expõe e-mail/saldo)
- [x] **Wishlist** (seção 11.13): toggle na página da edição + grade no perfil
- [x] (Coleção com grid/filtros e detalhe do Momento já entregues na Fase 2)

## Fase 4 — Mercado + Scores (aceite) — fecha o MVP econômico
- [x] Buy Now (preço fixo), listar/deslistar (Listing único por Moment, re-ativável)
- [x] ✅ compra ajusta saldos (comprador − preço, vendedor + preço − **taxa 5%**), ASP e score
- [x] Floor price, Preço médio (ASP = média móvel das últimas vendas), indicador "À venda"
- [x] **Pricing Helper** (vendas recentes ao listar); **Pontuação wefans dinâmica** (`max(preço, ASP)`)
- [x] Revisão **anti-anômalo** (preço > 3× ASP marca a transação) — Conduta
- [x] **Feed de vendas ao vivo** (polling) na home e em `/mercado/atividade`
- [x] Web: `/mercado` (filtros/ordenação), `/mercado/atividade`, ações (comprar/vender/cancelar) no Momento
- [x] Testes: 11/11 de integração (taxa, ASP, score dinâmico, anti-anômalo, própria-compra)

## Fase CK — Check-in por geolocalização (aceite) — FECHA O MVP ⭐
- [x] `GET /checkin/nonce` (challenge-response), `GET /fixtures/active`, `POST /checkin`, `GET /checkin/history`
- [x] Validação 100% server-side (A2.2): jogo+janela, **geofence haversine**, sinais de mock,
  precisão, nonce single-use, unicidade por jogo, **teleport/velocidade** → REVIEW, atestado (simulado na web)
- [x] ✅ dentro do raio+janela → **minta o pacote** (reusa `services/mint` via PackInventory);
  fora do raio / fora da janela / mock / atestado inválido / nonce inválido → **não** dá; **nunca duplica**
- [x] Fila de **revisão de fraude** do admin (`/admin/checkins/review`, `/resolve`) + `requireAdmin`
- [x] Web: `/checkin` (simulador do fluxo do app) — check-in no estádio → revelação do pacote
- [x] Testes: 13/13 de integração (todas as rejeições + fluxo feliz + duplicado + histórico)

## Fase 5 — Ofertas, Lock, Burn, Gift, Desafios + Builder (aceite)
- [x] **Ofertas**: ofertar em Moment (serial) ou edição; dono aceita → executa como venda (taxa 5%); cancelar
- [x] **Travar** (1 ano): bloqueia vender/queimar/presentear/forjar; cancela anúncio ativo
- [x] **Queimar**: burned=true, dono=null, decrementa circulatingCount (mantém mintedCount), recalcula score
- [x] **Presentear**: transfere sem pagamento, registra GIFT, recalcula scores dos dois
- [x] **Desafios STANDARD** (possuir os Lances → recompensa) e **CRAFTING** (queima a entrada → recompensa)
- [x] **Montador de Entrada** (Builder) com feedback de elegibilidade; conclusão única por usuário
- [x] Web: ações no Momento, painel de Ofertas, `/ofertas`, `/jogar/desafios` (hub + progresso) e Builder
- [x] Testes: 22/22 de integração; `settleSale` compartilhado entre Buy Now e aceitar-oferta

## Fase 6 — Drops com fila + Collector Score + Rebound + Mercado de Pacotes (aceite)
- [x] **Score do Colecionador** (pontos por tier + bônus de desafio), recalculado a cada mudança de posse
- [x] Drop: sala de espera → **fila aleatória** (admin inicia) → **janela de 20 min** por posição
- [x] ✅ **requisito de Collector Score** para entrar na fila; **rebound** para quem perde a janela (se `hasRebound`)
- [x] **Mercado de Pacotes**: listar/comprar/cancelar pacotes lacrados (`PackListing`, taxa 5%)
- [x] Web: `/drops`, `/drop/[id]` (sala/fila/janela/rebound), `/mercado/pacotes`
- [x] Testes: 20/20 de integração (gate de score, fila aleatória, janela, rebound, mercado de pacotes)

## Fase 7 — Vitrines, Missões, Fichas de Troca (aceite)
- [x] **Vitrines** (Showcases): criar/editar/excluir, adicionar/remover Lances, público/privado, `/vitrine/[id]`
- [x] **Missões** (Quests): critério (ex.: vitrine com 3 competições) → recompensa; resgate único (`QuestClaim`)
- [x] **Fichas de Troca**: cada Lance vira 1 ficha (queima o Lance); trocar 3 fichas por pacote `ticketOnly`
- [x] Web: `/vitrines`, `/vitrine/[id]` (editor), `/jogar/missoes`, `/fichas`; ação "Virar ficha" no Momento
- [x] Testes: 18/18 de integração (vitrines CRUD + visibilidade, missão elegível/resgate/único, fichas)

## Fase 8 — Rankings + Checklists + Flash + motor de simulação (aceite)
- [x] **Motor de partidas simulado** (`lib/matchSim.ts`): boxscores determinísticos por (data, jogador)
- [x] **Rankings**: sobe **travando** Lances (tempLock 7d + LeaderboardLock; pontos = Pontuação wefans)
- [x] ✅ travar Moment pontua no ranking; **snapshot** define ranks, **premia o top 1** (pacote) e libera as travas
- [x] **Checklists**: progresso por posse; bônus soma no **ranking do time** e no **Collector Score** (resgate único)
- [x] **Desafios Relâmpago** (FLASH): critério contra stats simuladas de hoje (`flashRuleJson`); resgate único
- [x] Web: `/jogar/rankings` (+detalhe com travar/snapshot admin), `/jogar/checklists`, FLASH no hub/detalhe
- [x] Testes: 21/21 de integração (travar/pontos/duplo, checklist ×2 destinos, snapshot/prêmio/liberação, flash determinístico)

## Fase 9 — Pelada (Fast Break) (aceite)
- [x] Runs com dias (statKey + alvo do dia); escalar **5 Lances de jogadores distintos**; **captain 2×**
- [x] **Fadiga por ASP**: usos por jogador no run conforme valor do Moment; consumo no submit; recusa quando esgota
- [x] **Fechar o dia** (admin): score via stats simuladas (determinístico) vs alvo → won; idempotente
- [x] Leaderboards **diário** (board do dia) e **do run** (vitórias, desempate por score total)
- [x] **Marcos**: 3ª vitória no run concede pacote (`rewardPackId`); **survivor**: derrota elimina
- [x] Web: `/jogar/pelada` (runs, dias, standings) + `/jogar/pelada/dia/[id]` (escalação com fadiga/captain, board)
- [x] Testes: 19/19 de integração (tamanho/distintos/captain, fadiga real, fechar/estável, survivor eliminação)

## Fase 10 — Admin completo + métricas + jobs (aceite)
- [x] **Cron runner** no backend: AGENDADO→PUBLICADO, expira ofertas, encerra drops, fecha rodadas da Pelada (+tick manual)
- [x] **Parcerias** (seção 10.2/10.3): criar time+estádio; **Liberar parceria** (publica tudo em transação); **Pausar** (oculta sem apagar)
- [x] **Ciclo de publicação** (10.1): publicar/agendar/encerrar/rascunho por conteúdo (template/team/series/set)
- [x] Cadastro: players, templates (rascunho por padrão), fixtures (janela derivada do kickoff)
- [x] **Mint de cortesia**; **métricas** (usuários, moments, vendas, volume, taxas, tx sinalizadas, fraude)
- [x] **Log de auditoria** (`AuditLog`) em toda ação admin; fila de fraude com UI
- [x] Web: `/admin` (painel), `/admin/parcerias`, `/admin/conteudo`, `/admin/jogos`, `/admin/fraude` (guard isAdmin)
- [x] Testes: 17/17 de integração (guard, parceria libera/pausa/visibilidade, cron promove/expira, cortesia, auditoria)

## Tabela de paridade (seção 2)
| # | Top Shot | wefans | Fase | Status |
|---|----------|--------|------|--------|
| 1 | Moments (NFT de highlight) | Lances numerados | 2 | ✅ |
| 2 | Series → Sets → Tiers | Temporada → Coleções → Raridades | 0/2 | ✅ |
| 3 | Tiers (Common…Ultimate) | Comum, Torcida, Raro, Lendário, Galáctico | 0 | ✅ |
| 4 | Edições CC e LE | Circulante e Limitada | 2 | ✅ |
| 5 | Numeração de série (#/N) | idem | 2 | ✅ |
| 6 | Badges em Moments | Selos | 2 | ✅ |
| 7 | Pack Drops (sala/fila/janela) | idem | 6 | ✅ |
| 8 | Rebound packs | Pacotes de repescagem | 6 | ✅ |
| 9 | Allowlist / Collector Score na fila | idem | 6 | ✅ (via Collector Score) |
| 10 | Abertura de pacote com revelação | idem | 2 | ✅ (revelação 2D; cubo 3D na Fase 11) |
| 11 | Pack Marketplace (lacrados) | Mercado de Pacotes | 6 | ✅ |
| 12 | Marketplace de Moments (Buy Now) | idem | 4 | ✅ |
| 13 | Taxa, floor, "À venda" | idem | 4 | ✅ |
| 14 | Offers | Ofertas | 5 | ✅ |
| 15 | ASP + Pricing Helper | Preço médio + ajudante | 4 | ✅ |
| 16 | Gifting | Presentear | 5 | ✅ |
| 17 | Trade Tickets | Fichas de Troca | 7 | ✅ |
| 18 | Locking (1 ano) | Travar | 5 | ✅ |
| 19 | Burn / Crafting Challenges | Queima / Desafios de Forja | 5 | ✅ |
| 20 | Challenges + Builder | Desafios + Montador | 5 | ✅ |
| 21 | Flash Challenges | Desafios Relâmpago | 8 | ✅ |
| 22 | Quests / Showcase Challenges | Missões | 7 | ✅ |
| 23 | Showcases | Vitrines | 7 | ✅ |
| 24 | Top Shot Score (dinâmico) | Pontuação wefans | 4 | ✅ |
| 25 | Collector Score | Score do Colecionador | 6 | ✅ |
| 26 | Leaderboards Time/Jogador | Rankings | 8 | ✅ |
| 27 | Checklists | Checklists | 8 | ✅ |
| 28 | Fast Break (fantasy) | Pelada | 9 | ✅ |
| 29 | Survivor pool | Mata-mata | 9 | ✅ |
| 30 | Carteira + depósito | idem (simulado) | 1 | ✅ |
| 31 | Withdraw / redeem físico | Saque / resgate | 13 | 🟨 (stub — OwnershipProvider pronto p/ plugar chain) |
| 32 | Provenance | Procedência | 3 | ✅ |
| 33 | Perfil com score/stats | Perfil | 3 | ✅ |
| 34 | Code of Conduct / anti-wash | Conduta / preço anômalo | 4 | ✅ (flag > 3× ASP) |
| 35 | Painel admin | Admin | 10 | ✅ |

## Conceitos novos das telas (seção 11.13)
| Conceito | Status |
|----------|--------|
| Wishlist / Lista de desejos | ✅ (toggle na edição + grade no perfil) |
| Parallels (variantes visuais) | ✅ (campo `parallel` exibido em cartas/detalhe) |
| Check-in por geolocalização (A2) | ✅ (server-side; atestação simulada na web até o app) |

## Fase 11 — Polimento (aceite)
- [x] **3D Moment (Three.js)** ⭐: cubo com moldura neon por raridade; faces = lance
  (prancheta+trajetória+camisa) · escudo holográfico · painel de stats · marca wefans;
  **arraste para girar**, auto-rotação no idle, `prefers-reduced-motion` desliga
- [x] **Medidor semicircular de propriedade** (Não listados · À venda · Travados · Queimados)
- [x] Fontes da marca (Anton/Outfit/Space Mono via next/font); foco visível por teclado
- [x] Menu mobile (hamburger) na top bar; skeletons de carregamento nas grades
- [x] **Testes formalizados** (seção 9): `npm run test:integration` — 10 suítes (auth, mint
  concorrente, mercado, check-in, ofertas/locks/desafios, drops, vitrines/missões/fichas,
  rankings/flash, pelada, admin/cron) com re-seed entre elas

## Fase 12 — Hardening (aceite)
- [x] **Rate limit** global (300/min por usuário/IP) + duro em login/cadastro (10/min) e check-in (20/min); 429 `RATE_LIMITED`
- [x] **Headers de segurança** (@fastify/helmet); logs estruturados (Fastify) + AuditLog admin
- [x] **Revisão de transações monetárias**: fila de sinalizadas (>3× ASP) em `/admin/conduta` com resolver
- [x] **Código de Conduta** público em `/conduta` + footer institucional (seção 11.2)

## Fase 13 (opcional) — On-chain (entregue como abstração + stub)
- [x] Interface **`OwnershipProvider`** (`onMint`/`onTransfer`/`onBurn`) + impl **`DbOwnership`** (v1 em banco)
- [x] `POST /wallet/withdraw` → stub honesto (INDISPONIVEL até plugar Flow/L2); resgate físico idem
- [ ] Integração real com blockchain (fora do escopo desta versão, por design do brief)

---

## 🏁 Status final: 33 ✅ + 1 🟨 (stub) de 35 itens · Fases 0→13 concluídas
