# indexer

Indexer on-chain do Tokenlens, construído com [Ponder](https://ponder.sh).

- **Descoberta chain-wide**: indexa eventos `Transfer` de todos os contratos da Robinhood Chain (sem address fixo) — novos tokens entram no catálogo no primeiro Transfer.
- **Classificação camada 1**: tokens presentes em `packages/registry/rwa.json` já nascem com categoria RWA.
- **Saldos materializados**: tabela `balance` por (token, holder), base da métrica de holders.
- **Checkpoint de blocos**: tabela `chain_checkpoint` registra a head periodicamente para monitorar lag.
- **API**: GraphQL em `/` e `/graphql`, SQL client em `/sql/*` (porta 42069 no dev).

## Rodando

```bash
cp .env.local.example .env.local   # ou edite .env.local
pnpm dev
```

Sem `DATABASE_URL`, o Ponder usa PGlite embutido; para Postgres, suba o banco com `docker compose up -d` na raiz.
