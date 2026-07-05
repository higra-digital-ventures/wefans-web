# ROADMAP.md — v2 do wefans (pós-paridade)

> A v1 (Fases 0→13 do brief) está entregue — ver `PARITY.md` (33✅ + 1 stub de 35).
> Este documento assume a evolução no **mesmo método** que funcionou na v1: fases com
> critérios de aceite, commit ao fim de cada uma, desvios registrados no `DECISIONS.md`.
> Ordem = prioridade. Legenda: ⬜ pendente · 🟨 parcial · ✅ pronto.

---

## Fase 14 — Contrato de API + CI + testes unitários ⬜

**Por quê primeiro:** o spec OpenAPI é a fonte única do contrato web/app prometida na
seção A1 do brief e nunca entregue — bloqueia o app Flutter. CI e unit tests protegem
tudo o que vem depois.

- [ ] **OpenAPI** gerado dos schemas Zod (`zod-to-openapi` ou `fastify-zod-openapi`),
      servido em `GET /api/v1/openapi.json` e commitado em `backend/openapi.json`
- [ ] Geração do **cliente Dart** validada a partir do spec (`openapi-generator`),
      mesmo antes do app existir (prova o pipeline)
- [ ] (Opcional) tipos TS do frontend gerados do spec — mata a duplicação manual de
      `frontend/lib/types.ts`
- [ ] **Testes unitários** (vitest) das regras puras, sem banco: sorteio ponderado do
      mint, fadiga por ASP, haversine/geofence, `matchSim` determinístico, cálculo de
      Pontuação wefans e Collector Score
- [ ] **CI (GitHub Actions):** typecheck + build (back e front) + unit + suíte de
      integração com Postgres de serviço, em todo push/PR
- [ ] **Aceite:** PR com contrato quebrado ou regra de negócio regredida **falha no CI**;
      `openapi.json` diverge do código ⇒ job falha

## Fase 15 — Produção: deploy, staging e operação ⬜

**Por quê:** a seção 1 do brief cita os alvos (Railway/Render + Vercel + Neon) mas
nenhuma fase entregou o caminho até produção.

- [ ] Backend + Postgres gerenciado + frontend publicados; domínio + HTTPS; `CORS_ORIGIN`
      e cookies (`secure`, `sameSite`) revisados para cross-origin real
- [ ] Ambiente de **staging** com seed fictício; produção **sem** seed de teste
- [ ] **Secrets** fora do repo (env do provedor); segredos JWT fortes e rotacionáveis
- [ ] **Cron seguro para múltiplas instâncias:** lock distribuído
      (ex.: `pg_advisory_lock`) ou instância única declarada — hoje o runner in-process
      **duplicaria jobs** com 2+ réplicas do backend
- [ ] **Backups** automáticos do Postgres + restore testado uma vez
- [ ] **Observabilidade mínima:** logs agregados, alerta de erro 5xx, uptime check em
      `/api/v1/health`
- [ ] **Aceite:** deploy reproduzível documentado no README; derrubar uma instância não
      duplica nem perde jobs de cron; restore de backup validado

## Fase 16 — LGPD, termos e privacidade ⬜

**Por quê:** o produto coleta **geolocalização** (dado sensível na LGPD), e-mail e
histórico financeiro. `LEGAL.md` cobre propriedade intelectual, não privacidade.
Pré-requisito de lançamento público no Brasil.

- [ ] **Política de privacidade** e **termos de uso** públicos (páginas irmãs de `/conduta`)
- [ ] **Consentimento explícito** para geolocalização no fluxo de check-in (web e app)
- [ ] **Retenção definida** para dados de check-in (coords, accuracy, IP, device id do
      `AuditLog`/`CheckIn`) — anonimizar ou expurgar após N meses
- [ ] Direitos do titular: exportar dados e **excluir conta** (decidir destino dos
      Moments/saldo — documentar no `DECISIONS.md`)
- [ ] Atualizar `LEGAL.md` com o capítulo de privacidade
- [ ] **Aceite:** check-in só ocorre após consentimento registrado; exclusão de conta
      funciona de ponta a ponta; retenção automatizada rodando no cron

## Fases M0→M3 — App Flutter (o diferencial) ⬜

**Por quê:** toda a arquitetura API-first existe por causa dele; o check-in real está
inoperante por design até o app existir (atestação retorna `false` em produção).

- [ ] **M0 — Fundação:** repo/pasta `mobile/` (Flutter), cliente Dart gerado do OpenAPI
      (Fase 14), telas de login/cadastro consumindo `/auth` com JWT + refresh rotativo
      · *Aceite:* login/refresh/logout no emulador contra a API local
- [ ] **M1 — Economia espelho:** coleção, detalhe do Lance, mercado (comprar/vender),
      pacotes + abertura (3D Moment via WebView do componente web, decisão da seção
      11.7.1) · *Aceite:* fluxo comprar→abrir→ver na coleção completo no app
- [ ] **M2 — Check-in real ⭐:** `geolocator` (lat/lng/accuracy/isMocked) + **Firebase
      App Check** (Play Integrity/App Attest); backend troca a atestação simulada pela
      verificação real do token · *Aceite:* check-in válido em dispositivo físico dentro
      do raio concede o pacote; emulador/root/mock **rejeitado**; simulador web continua
      funcionando em dev
- [ ] **M3 — Polimento + lojas:** push (drop abrindo, oferta recebida), deep links,
      build assinado, fichas de loja (o footer da web já anuncia os apps)
      · *Aceite:* build de release instalável; beta fechado publicado

## Fase 17 — Pagamentos reais ⬜

**Por quê por último:** vender colecionáveis por BRL real envolve split para vendedores,
KYC, estorno, impostos e possível enquadramento regulatório — é decisão de negócio antes
de código. O `PaymentProvider`/`FakeWallet` já isola o acoplamento.

- [ ] **Documento de decisão primeiro** (`.claude/PAYMENTS.md`): provedor (Stripe/Pagar.me/
      Mercado Pago), modelo (recarga de carteira vs checkout direto), split/KYC de
      vendedores, política de estorno/chargeback, impostos
- [ ] Implementar novo `PaymentProvider` atrás da interface existente; `FakeWallet`
      permanece em dev/staging
- [ ] Webhooks idempotentes (recarga confirmada, chargeback ⇒ congela saldo/Moment)
- [ ] Revisar fila anti-anômalo/conduta com olhar de **anti-lavagem** (wash trading com
      dinheiro real é outro risco)
- [ ] **Aceite:** depósito real em staging (modo test do provedor) credita a carteira;
      chargeback reverte com trilha no `AuditLog`

---

## Débitos técnicos (pagar oportunisticamente, com gatilho definido)

| Débito | Gatilho para pagar |
|--------|--------------------|
| `package.json#prisma` deprecado → `prisma.config.ts` | Ao subir para Prisma 7 |
| Tailwind v3.4 → v4 | Só se algum recurso do v4 for necessário (reavaliação da Fase 11 feita: ficar no v3) |
| Polling → **SSE** (fila de drop, feed ao vivo, Flash) | Quando houver usuários simultâneos reais (o brief pedia SSE; polling entrega o mesmo dado) |
| `isAdmin` booleano → papéis (RBAC) | Quando houver 2º operador humano no admin |
| Wizard de onboarding de parceria (seção 10.3 completa) | Quando houver 2ª parceria real sendo cadastrada |
| Registrar no `DECISIONS.md` o ambiente Windows/Postgres 18 (dev atual) | Imediato (governança) |

## Fora de escopo consciente (não planejar por ora)

- **On-chain real** (item 31): a abstração `OwnershipProvider` está pronta; plugar
  Flow/L2 só quando houver decisão de produto sobre custódia/marketplace externo.
- **Vídeos reais de lances:** depende de parceria com detentores de direitos —
  o conteúdo permanece 100% fictício (ver `LEGAL.md`) até existir contrato.
