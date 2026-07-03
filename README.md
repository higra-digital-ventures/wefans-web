# wefans

Plataforma de colecionáveis digitais de **futebol** — momentos/lances numerados, mercado,
pacotes, desafios, rankings e **check-in por geolocalização** no app. Paridade de
funcionalidades com o NBA Top Shot, conteúdo 100% fictício (ver [`.claude/LEGAL.md`](.claude/LEGAL.md)).

Arquitetura **API-first**: toda regra de negócio vive no `backend/`; a web (`frontend/`) e o
app (Flutter, futuro) são clientes finos da mesma API `/api/v1`.

- Especificação completa: [`.claude/wefans_claude_code_brief.md`](.claude/wefans_claude_code_brief.md)
- Decisões de implementação: [`.claude/DECISIONS.md`](.claude/DECISIONS.md)
- Progresso de paridade: [`.claude/PARITY.md`](.claude/PARITY.md)
- Próximas fases (v2): [`.claude/ROADMAP.md`](.claude/ROADMAP.md)

## Stack
- **backend/** — Node + TypeScript + Fastify + Prisma (PostgreSQL) + Zod · porta **4000**
- **frontend/** — Next.js 15 (App Router) + TypeScript + Tailwind · porta **3000**
- **Banco** — PostgreSQL (Docker _ou_ Postgres local — ver abaixo)

## Pré-requisitos
- Node 20+ e npm 10+
- PostgreSQL: **Docker** (usa `docker-compose.yml`) **ou** um Postgres local rodando.
  Os scripts (`scripts/db-up.sh`, `dev.sh`) detectam Docker e caem para o local se ausente.

## Setup rápido
```bash
npm run setup   # instala deps, sobe o Postgres, aplica migrações e semeia
npm run dev     # backend :4000 + frontend :3000
```
Ou, em um passo (sobe DB, migra, semeia se vazio e roda tudo):
```bash
./dev.sh
```

Depois abra:
- Frontend: http://localhost:3000
- API health: http://localhost:4000/api/v1/health
- API stats: http://localhost:4000/api/v1/system/stats

## Configuração de ambiente
Copie os exemplos e ajuste conforme seu Postgres:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```
- **Docker:** `DATABASE_URL="postgresql://wefans:wefans@localhost:5432/wefans?schema=public"`
- **Postgres local (macOS/Homebrew):** `DATABASE_URL="postgresql://SEU_USUARIO@localhost:5432/wefans?schema=public"`

## Scripts (raiz)
| Script | O que faz |
|--------|-----------|
| `npm run setup` | install + db:up + migrate (deploy) + seed |
| `npm run dev` | backend + frontend juntos (`concurrently`) |
| `npm run db:up` | sobe Postgres (Docker ou local) |
| `npm run db:migrate` | aplica migrações commitadas (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | cria/aplica migração de desenvolvimento (`prisma migrate dev`) |
| `npm run db:seed` | popula o banco (seed 100% fictício) |
| `npm run build` | build de backend + frontend |

## Estrutura
```
wefans/
  .claude/     → brief, DECISIONS.md, PARITY.md, LEGAL.md (docs centralizadas)
  backend/     → API + regra de negócio + Prisma (expõe /api/v1)
  frontend/    → web client (Next.js) — só consome a API
  scripts/     → db-up.sh (bootstrap do Postgres)
  docker-compose.yml, dev.sh, package.json (workspaces)
```

## Status
**Todas as fases do plano (0→13) estão entregues** — ver [`.claude/PARITY.md`](.claude/PARITY.md)
(33✅ + 1 stub de 35 itens de paridade com o Top Shot): auth web+app, carteira, mint atômico,
coleção/procedência, mercado (taxa/ASP/score dinâmico/anti-anômalo), **check-in por
geolocalização**, ofertas/travar/queimar/presentear, desafios (padrão/forja/relâmpago),
drops com fila+rebound, mercado de pacotes, vitrines, missões, fichas de troca, rankings,
checklists, **Matchday (fantasy)** com fadiga/survivor, admin completo com parcerias e cron,
**3D Moment (Three.js)**, hardening (rate limit/helmet/conduta) e a abstração
`OwnershipProvider` para on-chain futuro.

- Testes: `npm run test:integration` (10 suítes, 158 checks) com a API no ar.
- Logins de teste: `admin@wefans.test` · `colecionador@wefans.test` (senha `wefans123`).
