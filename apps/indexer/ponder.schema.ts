import { index, onchainTable, primaryKey } from "ponder";

/**
 * Todos os tokens ERC-20 descobertos na chain via eventos Transfer.
 * Metadata on-chain é lida no primeiro Transfer; a classificação vem da
 * allowlist do registry (camada 1) ou da heurística de símbolo (camada 2).
 */
export const token = onchainTable("token", (t) => ({
  address: t.hex().primaryKey(),
  name: t.text(),
  symbol: t.text(),
  decimals: t.integer(),
  // TokenCategory de @tokenlens/shared:
  // stock | etf | stablecoin | candidate | other | unclassified
  category: t.text().notNull().default("unclassified"),
  firstSeenAt: t.integer().notNull(),
  firstSeenBlock: t.bigint().notNull(),
  transferCount: t.bigint().notNull().default(0n),
  holderCount: t.bigint().notNull().default(0n),
}));

export const transferEvent = onchainTable(
  "transfer_event",
  (t) => ({
    id: t.text().primaryKey(),
    token: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    amount: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    tokenIdx: index("transfer_token_index").on(table.token),
    fromIdx: index("transfer_from_index").on(table.from),
    toIdx: index("transfer_to_index").on(table.to),
  }),
);

/** Saldo materializado por (token, holder) — base da métrica de holders. */
export const balance = onchainTable(
  "balance",
  (t) => ({
    token: t.hex().notNull(),
    holder: t.hex().notNull(),
    amount: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.token, table.holder] }),
    tokenIdx: index("balance_token_index").on(table.token),
    holderIdx: index("balance_holder_index").on(table.holder),
  }),
);

/**
 * Pools estilo Uniswap v3 descobertos pelo primeiro evento Swap.
 * token0/token1/feeTier são lidos on-chain na descoberta; sqrtPriceX96 e
 * tick refletem o último swap (usados para derivar preço spot).
 */
export const pool = onchainTable(
  "pool",
  (t) => ({
    address: t.hex().primaryKey(),
    token0: t.hex(),
    token1: t.hex(),
    feeTier: t.integer(),
    sqrtPriceX96: t.bigint().notNull(),
    tick: t.integer().notNull(),
    swapCount: t.bigint().notNull().default(0n),
    firstSeenAt: t.integer().notNull(),
    lastSwapAt: t.integer().notNull(),
  }),
  (table) => ({
    token0Idx: index("pool_token0_index").on(table.token0),
    token1Idx: index("pool_token1_index").on(table.token1),
  }),
);

export const swapEvent = onchainTable(
  "swap_event",
  (t) => ({
    id: t.text().primaryKey(),
    pool: t.hex().notNull(),
    sender: t.hex().notNull(),
    recipient: t.hex().notNull(),
    amount0: t.bigint().notNull(),
    amount1: t.bigint().notNull(),
    sqrtPriceX96: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    poolIdx: index("swap_pool_index").on(table.pool),
    timestampIdx: index("swap_timestamp_index").on(table.timestamp),
  }),
);

/** Volume de swaps agregado por (pool, hora) — insumo do volume 24h/7d. */
export const poolHourData = onchainTable(
  "pool_hour_data",
  (t) => ({
    pool: t.hex().notNull(),
    hour: t.integer().notNull(),
    swapCount: t.integer().notNull(),
    volumeAbs0: t.bigint().notNull(),
    volumeAbs1: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.pool, table.hour] }),
    hourIdx: index("pool_hour_index").on(table.hour),
  }),
);

/** Atividade de transferências agregada por (token, hora). */
export const tokenHourData = onchainTable(
  "token_hour_data",
  (t) => ({
    token: t.hex().notNull(),
    hour: t.integer().notNull(),
    transferCount: t.integer().notNull(),
    volume: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.token, table.hour] }),
    hourIdx: index("token_hour_index").on(table.hour),
  }),
);

/** Checkpoint periódico da head da chain, para monitorar lag de indexação. */
export const chainCheckpoint = onchainTable("chain_checkpoint", (t) => ({
  blockNumber: t.bigint().primaryKey(),
  timestamp: t.integer().notNull(),
}));
