# Tokenlens — Plano de Desenvolvimento

**RWA Screener / explorador de ativos tokenizados na Robinhood Chain**

Data: julho/2026 · Status: **Fases 0–4 implementadas** (ver §10 — registro de execução)

---

## 1. Objetivo

Construir um índice navegável de todos os RWAs (Real-World Assets) disponíveis na Robinhood Chain, com métricas de:

- **Volume** (24h / 7d / 30d, em USD)
- **Liquidez** (TVL em pools de DEX que envolvem o ativo)
- **Holders** (contagem de endereços com saldo, variação ao longo do tempo)
- **Atividade recente** (transações, transferências, novos holders, últimos trades)

O produto é um "screener de ações" para o mercado on-chain: uma tabela filtrável/ordenável de todos os ativos, com página de detalhe por ativo.

---

## 2. Contexto: a Robinhood Chain

Fatos relevantes para as decisões técnicas deste plano:

| Item | Detalhe |
|---|---|
| Tipo | L2 Ethereum permissionless, stack **Arbitrum Orbit** |
| Mainnet | Lançada em **01/07/2026** (testnet pública desde fev/2026) |
| Chain ID | **4663** (mainnet) |
| RPC público | `https://rpc.mainnet.chain.robinhood.com` (testnet: `https://rpc.testnet.chain.robinhood.com`) |
| Gas | ETH |
| Explorer | Blockscout (`robinhoodchain.blockscout.com`; testnet: `explorer.testnet.chain.robinhood.com`) |
| DeFi no launch | Uniswap, Chainlink, Morpho; Robinhood Earn (yield em USDG) |
| Escala | >10M tx/dia nas primeiras semanas; TVL ~US$ 312M |

### Como funcionam os stock tokens (RWAs oficiais)

- São **ERC-20 com 18 decimais** — a interface padrão basta para ler saldos, supply e histórico de transferências.
- Podem ter **restrições de transferência** (checagens de compliance/KYC no sender/receiver), além de possibilidade de congelamento/suspensão pelo emissor.
- Os endereços oficiais de stock tokens e ETFs são publicados na página **Token Contracts** da documentação da Robinhood, e os contratos são verificados no Blockscout.
- Novos tokens podem ser descobertos sem anúncio: basta agregar eventos `Transfer` por contrato emissor.

### Implicação de produto importante

A atividade da chain hoje é dominada por **memecoins**, não por stock tokens. Um screener "de RWAs" precisa, portanto, de uma **camada de classificação** que separe RWAs oficiais (stock tokens, ETFs, stablecoins lastreadas) do restante dos ERC-20 — caso contrário o índice vira uma lista de memecoins. Isso é tratado como feature de primeira classe (seção 5.3).

---

## 3. Escopo

### MVP (in)

1. Catálogo de todos os tokens ERC-20 da chain, com classificação RWA (stock token / ETF / stablecoin / outro).
2. Tabela screener: preço, market cap, volume 24h/7d, liquidez, nº de holders, tx 24h, variação de preço.
3. Filtros (categoria, faixa de liquidez/volume), ordenação por qualquer coluna e busca por nome/ticker/endereço.
4. Página de detalhe por ativo: gráfico de preço/volume, top holders, pools de liquidez, transferências e trades recentes.
5. Atualização de dados near-real-time (indexação contínua de blocos).

### Fora do MVP (fases futuras)

- Watchlists e alertas (e-mail/push).
- API pública para terceiros.
- Suporte multi-chain (outras chains com RWAs: Arbitrum One, Base, etc.).
- Conexão de carteira / portfólio pessoal.

---

## 4. Arquitetura

```
                       ┌─────────────────────┐
 RPC Robinhood Chain ──►                     │
 (blocos, logs, traces)│   Indexer (Ponder)  │──► PostgreSQL
                       │  - Transfer events  │      │
 Blockscout API ───────►  - Swaps Uniswap    │      │
 (holders, metadata,   │  - Pools/liquidez   │      ▼
  verificação)         │  - Snapshots        │  API (GraphQL/REST)
                       └─────────────────────┘      │
 Chainlink feeds ──► preços de referência           ▼
                                             Frontend Next.js
                                             (screener + detalhe)
```

### Componentes

1. **Indexer** — [Ponder](https://ponder.sh) (TypeScript, EVM-nativo, real-time + backfill, expõe GraphQL). Alternativa avaliada: Subsquid/SQD (já existe guia para Robinhood Chain); Ponder vence pela simplicidade de operação num monorepo TS.
2. **PostgreSQL** — armazenamento canônico. Tabelas de séries temporais (snapshots horários/diários) para gráficos e variações.
3. **API** — GraphQL gerada pelo Ponder para consultas cruas + rotas Next.js para agregações específicas do screener (ranking, paginação server-side).
4. **Frontend** — Next.js (App Router) + Tailwind + shadcn/ui + TanStack Table/Query. Renderização server-side da tabela principal para SEO e carga rápida.
5. **Fontes complementares**:
   - **Blockscout API**: contagem de holders (evita indexar todos os saldos no MVP), metadata de contratos verificados.
   - **Uniswap (v3/v4) na chain**: eventos `Swap`, `Mint`, `Burn` para volume e TVL de pools.
   - **Chainlink**: preços de referência ETH/USD e dos stock tokens quando houver feed; fallback para preço derivado de pool.

---

## 5. Design de dados e métricas

### 5.1 Modelo de dados (principais entidades)

- `tokens` — endereço, nome, símbolo, decimais, categoria (classificação), supply, emissor, verificado, criado_em.
- `pools` — DEX, par, fee tier, reservas, TVL USD.
- `swaps` — pool, token in/out, quantidades, valor USD, timestamp (retenção bruta limitada; agregado permanece).
- `transfers_agg` — agregados por token/hora (contagem, volume bruto, endereços únicos).
- `token_snapshots` — por token/hora e por token/dia: preço, volume USD, TVL, holders, tx count.
- `holders` (fase 2) — saldos materializados por endereço/token, para top holders e distribuição.

### 5.2 Definição das métricas

| Métrica | Fonte / cálculo |
|---|---|
| **Preço** | Feed Chainlink quando existir; senão preço spot derivado do pool mais líquido vs USDG/ETH |
| **Volume 24h/7d** | Soma de swaps DEX em USD; volume de `Transfer` bruto exibido separadamente (transferências ≠ negociação) |
| **Liquidez** | Soma do TVL (USD) dos pools que contêm o token |
| **Holders** | Blockscout API no MVP; materialização própria de saldos na fase 2 (permite variação Δ24h/Δ7d) |
| **Atividade recente** | Tx count 24h, transfers 24h, novos holders 24h, timestamp do último trade |

### 5.3 Classificação RWA (feature central)

Pipeline de três camadas:

1. **Allowlist oficial** — arquivo versionado (`registry/rwa.json`) sincronizado com a página Token Contracts da Robinhood (stock tokens e ETFs) + stablecoins conhecidas (USDG etc.). Categoria e metadados (ticker da ação subjacente, logo, setor).
2. **Heurísticas** — contrato verificado no Blockscout, padrão de bytecode do emissor Robinhood, presença de funções de compliance (freeze/restrict) → candidato a RWA, entra em fila de revisão.
3. **Curadoria manual** — PRs no arquivo de registry para promover/rebaixar tokens. O screener tem visão padrão "RWAs" e visão "Todos os tokens".

---

## 6. Fases de desenvolvimento

### Fase 0 — Fundação (semana 1)
- Monorepo pnpm (`apps/web`, `apps/indexer`, `packages/registry`, `packages/shared`).
- Config da chain (viem custom chain, ID 4663, RPCs mainnet/testnet), variáveis de ambiente, docker-compose com Postgres.
- CI (lint, typecheck, testes) e deploy contínuo de preview.
- **Entrega:** repositório rodando `pnpm dev` com indexer conectado à chain lendo blocos.

### Fase 1 — Catálogo e indexação base (semanas 2–3)
- Descoberta de tokens via eventos `Transfer` + seed do registry oficial.
- Ingestão de metadata ERC-20 (nome, símbolo, decimais, supply) via multicall.
- Classificação RWA (camadas 1 e 2) e integração Blockscout (holders, verificação).
- **Entrega:** endpoint/GraphQL listando todos os tokens com categoria e holders.

### Fase 2 — Métricas (semanas 3–5)
- Indexação de pools e swaps Uniswap; cálculo de preço, volume e TVL em USD.
- Snapshots horários/diários; agregados de transfers e atividade.
- Backfill desde o gênesis da mainnet (jul/2026 — histórico curto, backfill barato; fazer agora, antes que cresça).
- **Entrega:** todas as colunas do screener calculadas e testadas contra o Blockscout/DEX como referência.

### Fase 3 — Screener UI (semanas 5–6)
- Tabela principal com ordenação, filtros, busca e paginação server-side.
- Visões "RWAs" (padrão) e "Todos os tokens"; sparklines de preço 7d.
- **Entrega:** MVP navegável publicado (Vercel + indexer/DB em Railway ou Fly.io).

### Fase 4 — Página de detalhe do ativo (semanas 6–7)
- Gráficos de preço/volume/holders (séries dos snapshots).
- Top holders com % do supply, pools de liquidez, feed de trades e transfers recentes.
- Metadados do RWA: ação subjacente, emissor, restrições de transferência, link para contrato.
- **Entrega:** rota `/token/[address]` completa.

### Fase 5 — Polimento e lançamento (semana 8)
- Materialização própria de holders (substitui dependência do Blockscout, habilita Δ de holders).
- SEO, OG images por ativo, monitoramento (alertas de lag de indexação), rate limiting.
- **Entrega:** lançamento público v1.0.

---

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Rate limit / instabilidade do RPC público | Provider dedicado (QuickNode e outros já suportam a chain); retry/backoff; RPC configurável |
| Chain recém-lançada — contratos e endpoints podem mudar | Registry versionado; testes de contrato contra a testnet; camada de abstração sobre fontes de dados |
| Restrições de transferência distorcem métricas (liquidez "presa") | Sinalizar tokens com compliance-gate na UI; documentar metodologia das métricas |
| Ruído de memecoins polui o índice | Classificação em 3 camadas (seção 5.3) com visão padrão apenas-RWA |
| Preço sem oráculo para ativos de cauda longa | Derivar de pool mais líquido com salvaguardas (TVL mínimo, TWAP) e marcar confiabilidade |
| >10M tx/dia — custo de indexação cresce | Indexar por tópico de evento (não blocos inteiros), agregar cedo, retenção limitada de dados brutos |
| Reorgs de L2 | Ponder trata reorgs nativamente; confirmações mínimas para snapshots |

---

## 8. Questões em aberto

1. **Fonte canônica do registry oficial** — confirmar formato/URL da página Token Contracts e se há endpoint machine-readable para sincronização automática.
2. **USDG como moeda de cotação** — verificar profundidade dos pools vs ETH para escolher a base de preço.
3. **Perp/derivativos na chain** — se surgirem, decidir se entram no escopo de "volume".
4. **Monetização** (fora do MVP) — API paga, listagens destacadas, ou produto gratuito de portfólio.

---

## 9. Estrutura de repositório proposta

```
tokenlens/
├── apps/
│   ├── indexer/          # Ponder: handlers de eventos, schema, GraphQL
│   └── web/              # Next.js: screener, detalhe, rotas de API agregadas
├── packages/
│   ├── registry/         # rwa.json + scripts de sync/validação da allowlist
│   ├── chain/            # config viem da Robinhood Chain, ABIs, endereços
│   └── shared/           # tipos, formatação, cálculo de métricas
├── docker-compose.yml    # Postgres local
├── PLANO.md
└── README.md
```

---

## 10. Registro de execução (jul/2026)

| Fase | Status | Observações |
|---|---|---|
| 0 — Fundação | ✅ | Monorepo pnpm, docker-compose, CI, indexer Ponder 0.17, web Next.js 16 |
| 1 — Catálogo | ✅ | Descoberta chain-wide via `Transfer`, metadata on-chain (name/symbol/decimals com tolerância a contratos não-padrão), classificação em 3 camadas |
| 2 — Métricas | ✅ | Pools descobertos via `Swap` v3 chain-wide (dispensa conhecer a factory); preço USD pelo grafo de pools; volume/atividade por agregados horários incrementais (`pool_hour_data`/`token_hour_data`) em vez de snapshots agendados; liquidez pelos saldos dos pools; holders por contagem incremental (item da Fase 5 antecipado — dispensa Blockscout) |
| 3 — Screener UI | ✅ | Visões RWA/todos, busca, ordenação (transfers/holders/idade), paginação server-side |
| 4 — Detalhe | ✅ | Stats, gráfico SVG de atividade 7d, top holders com % do supply observado, pools, transferências recentes |
| 5 — Polimento | ◑ | SEO base e status de indexação no rodapé prontos; pendente: deploy, monitoramento, OG images |

**Validação**: typecheck/testes/build verdes em CI; pipeline completo (RPC → indexer → Postgres/PGlite → API → UI) exercitado contra uma chain local (ganache, chain ID 4663) com evento `Transfer` real — descoberta, holders, agregados e páginas confirmados. O RPC público da mainnet é bloqueado pela política de egress do ambiente de desenvolvimento remoto; o backfill real requer rodar fora dele (ou liberar `rpc.mainnet.chain.robinhood.com`).

**Desvios conscientes do plano**: ordenação por colunas USD (volume/liquidez) ainda não é server-side — essas métricas são computadas por página; snapshots horários/diários viraram agregados incrementais mantidos nos handlers; Uniswap v4 (PoolManager) fica como TODO.
