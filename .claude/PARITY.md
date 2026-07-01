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

## Tabela de paridade (seção 2)
| # | Top Shot | wefans | Fase | Status |
|---|----------|--------|------|--------|
| 1 | Moments (NFT de highlight) | Lances numerados | 2 | ✅ |
| 2 | Series → Sets → Tiers | Temporada → Coleções → Raridades | 0/2 | ✅ |
| 3 | Tiers (Common…Ultimate) | Comum, Torcida, Raro, Lendário, Galáctico | 0 | ✅ |
| 4 | Edições CC e LE | Circulante e Limitada | 2 | ✅ |
| 5 | Numeração de série (#/N) | idem | 2 | ✅ |
| 6 | Badges em Moments | Selos | 2 | ✅ |
| 7 | Pack Drops (sala/fila/janela) | idem | 6 | ⬜ |
| 8 | Rebound packs | Pacotes de repescagem | 6 | ⬜ |
| 9 | Allowlist / Collector Score na fila | idem | 6 | ⬜ |
| 10 | Abertura de pacote com revelação | idem | 2 | ✅ (revelação 2D; cubo 3D na Fase 11) |
| 11 | Pack Marketplace (lacrados) | Mercado de Pacotes | 6 | ⬜ |
| 12 | Marketplace de Moments (Buy Now) | idem | 4 | ⬜ |
| 13 | Taxa, floor, "À venda" | idem | 4 | ⬜ |
| 14 | Offers | Ofertas | 5 | ⬜ |
| 15 | ASP + Pricing Helper | Preço médio + ajudante | 4 | ⬜ |
| 16 | Gifting | Presentear | 5 | ⬜ |
| 17 | Trade Tickets | Fichas de Troca | 7 | ⬜ |
| 18 | Locking (1 ano) | Travar | 5 | ⬜ |
| 19 | Burn / Crafting Challenges | Queima / Desafios de Forja | 5 | ⬜ |
| 20 | Challenges + Builder | Desafios + Montador | 5 | ⬜ |
| 21 | Flash Challenges | Desafios Relâmpago | 8 | ⬜ |
| 22 | Quests / Showcase Challenges | Missões | 7 | ⬜ |
| 23 | Showcases | Vitrines | 7 | ⬜ |
| 24 | Top Shot Score (dinâmico) | Pontuação wefans | 4 | ⬜ |
| 25 | Collector Score | Score do Colecionador | 6 | ⬜ |
| 26 | Leaderboards Time/Jogador | Rankings | 8 | ⬜ |
| 27 | Checklists | Checklists | 8 | ⬜ |
| 28 | Fast Break (fantasy) | Pelada | 9 | ⬜ |
| 29 | Survivor pool | Mata-mata | 9 | ⬜ |
| 30 | Carteira + depósito | idem (simulado) | 1 | ✅ |
| 31 | Withdraw / redeem físico | Saque / resgate | 13 | ⬜ |
| 32 | Provenance | Procedência | 3 | ⬜ |
| 33 | Perfil com score/stats | Perfil | 3 | 🟨 (base na Fase 1) |
| 34 | Code of Conduct / anti-wash | Conduta / preço anômalo | 4 | ⬜ |
| 35 | Painel admin | Admin | 10 | ⬜ |

## Conceitos novos das telas (seção 11.13)
| Conceito | Status |
|----------|--------|
| Wishlist / Lista de desejos | 🟨 (modelo `Wishlist` criado) |
| Parallels (variantes visuais) | ✅ (campo `parallel` exibido em cartas/detalhe) |
| Check-in por geolocalização (A2) | ⬜ (Fase CK) |
