# Tokenlens

**RWA Screener / explorador de ativos tokenizados na Robinhood Chain.**

Um índice navegável de todos os RWAs disponíveis na chain: volume, liquidez, holders e atividade recente.

> 📋 Plano de desenvolvimento completo em [PLANO.md](./PLANO.md). Status atual: **Fase 0 (fundação) concluída**.

## Visão

A Robinhood Chain (L2 Ethereum construída sobre Arbitrum Orbit, mainnet desde 01/07/2026, chain ID 4663) é a primeira chain pública desenhada para ativos do mundo real — stock tokens, ETFs tokenizados e demais RWAs negociáveis 24/7 em mais de 120 países. O Tokenlens quer ser o "screener de ações" desse novo mercado: uma interface única para descobrir, comparar e acompanhar todos os ativos tokenizados da chain.

## Estrutura do monorepo

```
apps/
  indexer/    # Ponder: descoberta de tokens via Transfer, saldos, checkpoints
  web/        # Next.js: UI do screener
packages/
  chain/      # definição viem da Robinhood Chain (ID 4663), ABIs
  registry/   # allowlist curada de RWAs (rwa.json) + schema zod
  shared/     # categorias de token, formatação, utilitários
```

## Desenvolvimento

Pré-requisitos: Node.js ≥ 22, pnpm 10, Docker (opcional, para Postgres).

```bash
pnpm install

# (opcional) Postgres local — sem ele o indexer usa PGlite embutido
docker compose up -d

# indexer (porta 42069) + web (porta 3000)
pnpm dev

# verificações
pnpm typecheck && pnpm test && pnpm build
```

Configuração: copie `apps/indexer/.env.local.example` para `apps/indexer/.env.local` (RPC, bloco inicial, banco). O RPC público da mainnet é `https://rpc.mainnet.chain.robinhood.com`.

## Como o catálogo é montado

1. O indexer escuta eventos `Transfer` de **todos** os contratos da chain — um token novo entra no catálogo no primeiro Transfer (descoberta sem depender de anúncio).
2. Tokens listados na allowlist curada (`packages/registry/rwa.json`, validada por schema zod em CI) já nascem classificados como `stock`, `etf` ou `stablecoin` — a visão padrão do screener mostra só esses.
3. Metadata on-chain (nome, símbolo, decimais), heurísticas de classificação e métricas de volume/liquidez chegam nas Fases 1–2 do [plano](./PLANO.md#6-fases-de-desenvolvimento).

## Contribuindo com o registry

Para listar um RWA, abra um PR adicionando a entrada em `packages/registry/rwa.json`:

```json
{
  "address": "0x…",
  "symbol": "AAPLx",
  "name": "Apple Stock Token",
  "category": "stock",
  "underlyingTicker": "AAPL",
  "issuer": "Robinhood",
  "source": "https://robinhoodchain.blockscout.com/token/0x…"
}
```

O schema é validado nos testes (`pnpm test`); endereços duplicados ou categorias não-RWA são rejeitados.
