#!/usr/bin/env bash
# Fluxo completo de dev: sobe o Postgres, aplica migrações, semeia se necessário e
# então roda backend (:4000) + frontend (:3000) juntos.
set -euo pipefail
cd "$(dirname "$0")"

# 1) Postgres (Docker ou local)
bash scripts/db-up.sh

# 2) dependências (idempotente)
if [ ! -d node_modules ]; then
  echo "[dev] instalando dependências…"
  npm install
fi

# 3) migrações
MIGR_DIR="backend/prisma/migrations"
if [ -d "$MIGR_DIR" ] && [ -n "$(ls -A "$MIGR_DIR" 2>/dev/null || true)" ]; then
  echo "[dev] aplicando migrações (deploy)…"
  npm -w backend run prisma:deploy
else
  echo "[dev] criando migração inicial…"
  npm -w backend exec prisma migrate dev -- --name init
fi

# 4) seed só se o banco estiver vazio
echo "[dev] semeando se necessário…"
SEED_MODE=if-empty npm -w backend run seed || true

# 5) sobe tudo
echo "[dev] subindo backend + frontend…"
npm run dev
