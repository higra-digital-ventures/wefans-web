#!/usr/bin/env bash
API=http://localhost:4000/api/v1
JAR=$(mktemp)
PASS=0; FAIL=0
uid=$$
EMAIL="tester_${uid}@wefans.test"
USER="tester_${uid}"

jget() { node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));let v;try{v=eval(process.argv[1])}catch(e){v=undefined};console.log(v===undefined?"":v)' "$1"; }
check() { # desc, got, expected
  if [ "$2" = "$3" ]; then echo "  ✅ $1 → $2"; PASS=$((PASS+1)); else echo "  ❌ $1 → got '$2' expected '$3'"; FAIL=$((FAIL+1)); fi
}

curl -s --retry 40 --retry-delay 1 --retry-connrefused "$API/health" >/dev/null

echo "1) Cadastro (register) — seta cookie + retorna tokens"
REG=$(curl -s -c "$JAR" -X POST "$API/auth/register" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"username\":\"$USER\",\"password\":\"senha1234\"}")
check "email cadastrado" "$(echo "$REG" | jget 'd.user.email')" "$EMAIL"
check "saldo boas-vindas R\$500" "$(echo "$REG" | jget 'd.user.balanceCents')" "50000"
ACCESS=$(echo "$REG" | jget 'd.accessToken'); REFRESH=$(echo "$REG" | jget 'd.refreshToken')
[ -n "$ACCESS" ] && echo "  ✅ accessToken presente" && PASS=$((PASS+1)) || { echo "  ❌ sem accessToken"; FAIL=$((FAIL+1)); }
[ -n "$REFRESH" ] && echo "  ✅ refreshToken presente" && PASS=$((PASS+1)) || { echo "  ❌ sem refreshToken"; FAIL=$((FAIL+1)); }

echo "2) /me via COOKIE (web)"
check "username" "$(curl -s -b "$JAR" "$API/me" | jget 'd.user.username')" "$USER"

echo "3) /me via BEARER (app)"
check "username" "$(curl -s "$API/me" -H "authorization: Bearer $ACCESS" | jget 'd.user.username')" "$USER"

echo "4) /me SEM auth → 401"
check "status" "$(curl -s -o /dev/null -w '%{http_code}' "$API/me")" "401"

echo "5) Depósito simulado (cookie) — +R\$250"
DEP=$(curl -s -b "$JAR" -X POST "$API/wallet/deposit" -H 'content-type: application/json' -d '{"amountCents":25000}')
check "novo saldo" "$(echo "$DEP" | jget 'd.balanceCents')" "75000"
check "lançamento DEPOSIT" "$(echo "$DEP" | jget 'd.entry.type')" "DEPOSIT"

echo "6) Refresh rotativo — novo par emitido, antigo invalidado"
REF=$(curl -s -X POST "$API/auth/refresh" -H 'content-type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}")
NEW_ACCESS=$(echo "$REF" | jget 'd.accessToken'); NEW_REFRESH=$(echo "$REF" | jget 'd.refreshToken')
[ -n "$NEW_ACCESS" ] && [ "$NEW_REFRESH" != "$REFRESH" ] && echo "  ✅ novo par diferente do antigo" && PASS=$((PASS+1)) || { echo "  ❌ rotação falhou"; FAIL=$((FAIL+1)); }
check "refresh antigo reusado → 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/refresh" -H 'content-type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}")" "401"
check "novo access funciona em /me" "$(curl -s "$API/me" -H "authorization: Bearer $NEW_ACCESS" | jget 'd.user.username')" "$USER"

echo "7) Times públicos + escolher time seguido (cookie)"
TEAMS=$(curl -s "$API/teams")
TEAM_ID=$(echo "$TEAMS" | jget 'd.teams[0].id'); TEAM_NAME=$(echo "$TEAMS" | jget 'd.teams[0].name')
check "nº de times publicados" "$(echo "$TEAMS" | jget 'd.teams.length')" "20"
SETFAV=$(curl -s -b "$JAR" -X PATCH "$API/me" -H 'content-type: application/json' -d "{\"favoriteTeamId\":\"$TEAM_ID\"}")
check "time seguido definido" "$(echo "$SETFAV" | jget 'd.user.favoriteTeam.name')" "$TEAM_NAME"

echo "8) Login do usuário semeado (bearer) + senha errada"
LOGIN=$(curl -s -X POST "$API/auth/login" -H 'content-type: application/json' -d '{"email":"colecionador@wefans.test","password":"wefans123"}')
LA=$(echo "$LOGIN" | jget 'd.accessToken')
check "topShotScore do colecionador" "$(curl -s "$API/me" -H "authorization: Bearer $LA" | jget 'd.user.topShotScore')" "26150"
check "senha errada → 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'content-type: application/json' -d '{"email":"colecionador@wefans.test","password":"errada"}')" "401"

echo "9) Logout limpa a sessão"
curl -s -b "$JAR" -c "$JAR" -X POST "$API/auth/logout" >/dev/null
check "/me após logout (cookie limpo) → 401" "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$API/me")" "401"

rm -f "$JAR"
echo ""
echo "==== RESULTADO: $PASS passaram, $FAIL falharam ===="
[ "$FAIL" -eq 0 ]
