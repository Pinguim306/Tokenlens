# Tokenlens

**RWA Screener / explorador de ativos tokenizados na Robinhood Chain.**

Um índice navegável de todos os RWAs disponíveis na chain: volume, liquidez, holders e atividade recente.

> 📋 O projeto está em fase de planejamento. Veja o plano de desenvolvimento completo em [PLANO.md](./PLANO.md).

## Visão

A Robinhood Chain (L2 Ethereum construída sobre Arbitrum Orbit, mainnet desde 01/07/2026) é a primeira chain pública desenhada para ativos do mundo real — stock tokens, ETFs tokenizados e demais RWAs negociáveis 24/7 em mais de 120 países. O Tokenlens quer ser o "screener de ações" desse novo mercado: uma interface única para descobrir, comparar e acompanhar todos os ativos tokenizados da chain.

## Stack prevista

| Camada | Tecnologia |
|---|---|
| Indexer on-chain | Ponder (TypeScript) sobre RPC da Robinhood Chain |
| Banco de dados | PostgreSQL |
| API | REST/GraphQL servida pelo indexer + rotas Next.js |
| Frontend | Next.js + Tailwind CSS + shadcn/ui + TanStack Table |
| Dados complementares | Blockscout API, pools Uniswap, oráculos Chainlink |
