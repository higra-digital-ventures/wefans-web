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
- **2026-07-01 — [Fase 0] — Fontes (Anton/Outfit/Space Mono) adiadas para a Fase 11.**
  **Motivo:** `next/font/google` baixa fontes em build-time (dependência de rede);
  na Fase 0 usamos um stack de fontes do sistema com as **variáveis CSS** já nomeadas
  (`--font-display`, `--font-text`, `--font-mono`) para trocar sem refatorar depois.

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

## Adiado para fases posteriores (não construído na Fase 0)
- Auth real (cookie web + JWT/refresh app) — **Fase 1**. Seed já grava `passwordHash` com bcrypt.
- Lógica dos serviços `mint`/`market`/`checkin` — **Fases 2/4/CK** (na Fase 0 só a estrutura).
- Geração de spec **OpenAPI** e cliente Dart — a partir da Fase 1.
