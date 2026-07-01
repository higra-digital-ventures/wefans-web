#!/usr/bin/env bash
# Sobe o Postgres. Usa Docker se disponível; senão, cai para um Postgres local.
set -euo pipefail

DB_NAME="${DB_NAME:-wefans}"
SHADOW_DB_NAME="${SHADOW_DB_NAME:-wefans_shadow}"

wait_for_pg() {
  local tries=0
  until pg_isready >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 30 ]; then
      echo "[db:up] timeout esperando o Postgres ficar pronto" >&2
      exit 1
    fi
    sleep 1
  done
}

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "[db:up] Docker detectado — subindo Postgres via docker compose"
  docker compose up -d
  echo "[db:up] aguardando readiness…"
  for _ in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U wefans >/dev/null 2>&1; then
      echo "[db:up] Postgres (Docker) pronto"
      exit 0
    fi
    sleep 1
  done
  echo "[db:up] Postgres (Docker) não ficou pronto a tempo" >&2
  exit 1
fi

echo "[db:up] Docker ausente — usando Postgres local"
if ! command -v pg_isready >/dev/null 2>&1; then
  echo "[db:up] Nem Docker nem Postgres local encontrados. Instale um dos dois." >&2
  exit 1
fi

if ! pg_isready >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "[db:up] iniciando Postgres via Homebrew…"
    brew services start postgresql@14 >/dev/null 2>&1 \
      || brew services start postgresql@15 >/dev/null 2>&1 \
      || brew services start postgresql >/dev/null 2>&1 || true
  fi
  wait_for_pg
fi
echo "[db:up] Postgres local pronto"

# Garante que os bancos existem (idempotente).
for db in "$DB_NAME" "$SHADOW_DB_NAME"; do
  if ! psql -lqt 2>/dev/null | cut -d '|' -f1 | tr -d '[:space:]' | grep -qx "$db"; then
    echo "[db:up] criando banco '$db'"
    createdb "$db" 2>/dev/null || true
  fi
done
echo "[db:up] ok"
