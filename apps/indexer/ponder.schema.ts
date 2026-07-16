import { index, onchainTable, primaryKey } from "ponder";

/**
 * Todos os tokens ERC-20 descobertos na chain via eventos Transfer.
 * Metadata (nome/símbolo/decimais) e classificação são enriquecidas na Fase 1;
 * até lá a categoria vem da allowlist do registry ou fica "unclassified".
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
  }),
);

/** Checkpoint periódico da head da chain, para monitorar lag de indexação. */
export const chainCheckpoint = onchainTable("chain_checkpoint", (t) => ({
  blockNumber: t.bigint().primaryKey(),
  timestamp: t.integer().notNull(),
}));
