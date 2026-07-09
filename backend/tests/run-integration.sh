#!/usr/bin/env bash
# Suíte de integração (seção 9): roda cada suíte contra a API em :4000, re-semeando
# o banco entre elas (as suítes mutam dados). Requisito: backend rodando (npm run dev).
set -uo pipefail
cd "$(dirname "$0")/.."

API=http://localhost:4000/api/v1
if ! curl -s --max-time 3 "$API/health" >/dev/null; then
  echo "❌ API não está no ar em :4000 — rode 'npm run dev' antes." >&2
  exit 1
fi

TOTAL_FAIL=0
run_suite() {
  local file="$1"
  echo ""
  echo "━━━ $(basename "$file") ━━━"
  npx tsx prisma/seed.ts >/dev/null 2>&1
  local out
  if [[ "$file" == *.sh ]]; then
    out=$(bash "$file" 2>&1)
  else
    out=$(node "$file" "$@" 2>&1)
  fi
  local code=$?
  echo "$out" | tail -25
  if [ $code -ne 0 ] || echo "$out" | grep -qE '❌| [1-9][0-9]* falharam'; then
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
}

# 04-checkin precisa do id de um jogo agendado do time seguido (argumento).
scheduled_fixture() {
  node --input-type=module -e 'import "dotenv/config";import{PrismaClient} from "@prisma/client";const p=new PrismaClient();const f=await p.fixture.findFirst({where:{status:"SCHEDULED"},select:{id:true}});process.stdout.write(f?.id||"");await p.$disconnect()' 2>/dev/null | tr -d '[:space:]'
}

run_suite tests/01-auth.sh
run_suite tests/02-mint-concurrency.mjs
run_suite tests/03-market.mjs
npx tsx prisma/seed.ts >/dev/null 2>&1
echo ""
echo "━━━ 04-checkin.mjs ━━━"
node tests/04-checkin.mjs "$(scheduled_fixture)" 2>&1 | tail -20 || TOTAL_FAIL=$((TOTAL_FAIL + 1))
run_suite tests/05-offers-locks-challenges.mjs
run_suite tests/06-drops-packmarket.mjs
run_suite tests/07-showcases-quests-tickets.mjs
run_suite tests/08-rankings-flash.mjs
run_suite tests/09-fastbreak.mjs
run_suite tests/10-admin-cron.mjs

# baseline limpa ao final
npx tsx prisma/seed.ts >/dev/null 2>&1

echo ""
if [ $TOTAL_FAIL -eq 0 ]; then
  echo "✅ Todas as suítes passaram."
else
  echo "❌ $TOTAL_FAIL suíte(s) com falha."
  exit 1
fi
