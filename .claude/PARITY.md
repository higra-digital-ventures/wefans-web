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

## Tabela de paridade (seção 2)
| # | Top Shot | wefans | Fase | Status |
|---|----------|--------|------|--------|
| 1 | Moments (NFT de highlight) | Lances numerados | 2 | ⬜ |
| 2 | Series → Sets → Tiers | Temporada → Coleções → Raridades | 0/2 | 🟨 (modelado no schema+seed) |
| 3 | Tiers (Common…Ultimate) | Comum, Torcida, Raro, Lendário, Galáctico | 0 | ✅ (enum `Tier` + cores) |
| 4 | Edições CC e LE | Circulante e Limitada | 2 | 🟨 (modelado) |
| 5 | Numeração de série (#/N) | idem | 2 | 🟨 (modelado) |
| 6 | Badges em Moments | Selos | 2 | 🟨 (campo `badges`) |
| 7 | Pack Drops (sala/fila/janela) | idem | 6 | ⬜ |
| 8 | Rebound packs | Pacotes de repescagem | 6 | ⬜ |
| 9 | Allowlist / Collector Score na fila | idem | 6 | ⬜ |
| 10 | Abertura de pacote com revelação | idem | 2 | ⬜ |
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
| 30 | Carteira + depósito | idem (simulado) | 1 | ⬜ |
| 31 | Withdraw / redeem físico | Saque / resgate | 13 | ⬜ |
| 32 | Provenance | Procedência | 3 | ⬜ |
| 33 | Perfil com score/stats | Perfil | 3 | ⬜ |
| 34 | Code of Conduct / anti-wash | Conduta / preço anômalo | 4 | ⬜ |
| 35 | Painel admin | Admin | 10 | ⬜ |

## Conceitos novos das telas (seção 11.13)
| Conceito | Status |
|----------|--------|
| Wishlist / Lista de desejos | 🟨 (modelo `Wishlist` criado) |
| Parallels (variantes visuais) | 🟨 (campo `parallel` em Template/Moment) |
| Check-in por geolocalização (A2) | ⬜ (Fase CK) |
