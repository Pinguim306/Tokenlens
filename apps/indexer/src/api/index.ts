import { db } from "ponder:api";
import schema, {
  balance,
  chainCheckpoint,
  pool,
  token,
  tokenHourData,
  transferEvent,
} from "ponder:schema";
import { Hono } from "hono";
import {
  and,
  asc,
  client,
  count,
  desc,
  eq,
  graphql,
  gt,
  gte,
  ilike,
  inArray,
  or,
  replaceBigInts,
  sum,
} from "ponder";

import {
  RWA_CATEGORIES,
  toUnits,
  type StatusDto,
  type TokenDetailDto,
  type TokenRowDto,
  type TokensResponseDto,
} from "@tokenlens/shared";

import { computeTokenMetrics, loadPricingContext } from "./metrics";

const app = new Hono();

app.use("/sql/*", client({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

const serialize = <T>(value: T) => replaceBigInts(value, (v) => v.toString());

const SORT_COLUMNS = {
  transfers: token.transferCount,
  holders: token.holderCount,
  age: token.firstSeenAt,
} as const;

type SortKey = keyof typeof SORT_COLUMNS;

function toTokenRow(
  row: typeof token.$inferSelect,
  metrics: {
    priceUsd: number | null;
    volume24hUsd: number | null;
    liquidityUsd: number | null;
    transfers24h: number;
  },
): TokenRowDto {
  return {
    address: row.address,
    name: row.name,
    symbol: row.symbol,
    decimals: row.decimals,
    category: row.category as TokenRowDto["category"],
    priceUsd: metrics.priceUsd,
    volume24hUsd: metrics.volume24hUsd,
    liquidityUsd: metrics.liquidityUsd,
    holderCount: row.holderCount.toString(),
    transferCount: row.transferCount.toString(),
    transfers24h: metrics.transfers24h,
    firstSeenAt: row.firstSeenAt,
  };
}

app.get("/api/status", async (c) => {
  const [latest] = await db
    .select()
    .from(chainCheckpoint)
    .orderBy(desc(chainCheckpoint.blockNumber))
    .limit(1);
  const [tokens] = await db.select({ value: count() }).from(token);
  const [pools] = await db.select({ value: count() }).from(pool);

  const body: StatusDto = {
    latestBlock: latest ? latest.blockNumber.toString() : null,
    latestBlockTimestamp: latest ? latest.timestamp : null,
    tokenCount: tokens?.value ?? 0,
    poolCount: pools?.value ?? 0,
  };
  return c.json(body);
});

app.get("/api/tokens", async (c) => {
  const view = c.req.query("view") === "all" ? "all" : "rwa";
  const search = c.req.query("search")?.trim() ?? "";
  const sortParam = c.req.query("sort") ?? "transfers";
  const sort: SortKey = sortParam in SORT_COLUMNS ? (sortParam as SortKey) : "transfers";
  const order = c.req.query("order") === "asc" ? asc : desc;
  const limit = Math.min(Number(c.req.query("limit") ?? 25) || 25, 100);
  const offset = Math.max(Number(c.req.query("offset") ?? 0) || 0, 0);

  const filters = [];
  if (view === "rwa") {
    filters.push(inArray(token.category, [...RWA_CATEGORIES]));
  }
  if (search.length > 0) {
    const pattern = `%${search}%`;
    filters.push(
      or(
        ilike(token.symbol, pattern),
        ilike(token.name, pattern),
        eq(token.address, search.toLowerCase() as `0x${string}`),
      ),
    );
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const rows = await db
    .select()
    .from(token)
    .where(where)
    .orderBy(order(SORT_COLUMNS[sort]), asc(token.address))
    .limit(limit)
    .offset(offset);
  const [total] = await db.select({ value: count() }).from(token).where(where);

  const ctx = await loadPricingContext();
  const now = Math.floor(Date.now() / 1000);
  const metrics = await computeTokenMetrics(
    rows.map((r) => r.address),
    ctx,
    now,
  );

  const body: TokensResponseDto = {
    tokens: rows.map((row) =>
      toTokenRow(
        row,
        metrics.get(row.address) ?? {
          priceUsd: null,
          volume24hUsd: null,
          liquidityUsd: null,
          transfers24h: 0,
        },
      ),
    ),
    total: total?.value ?? 0,
    limit,
    offset,
  };
  return c.json(body);
});

app.get("/api/tokens/:address", async (c) => {
  const address = c.req.param("address").toLowerCase() as `0x${string}`;
  if (!/^0x[0-9a-f]{40}$/.test(address)) {
    return c.json({ error: "endereço inválido" }, 400);
  }

  const [row] = await db.select().from(token).where(eq(token.address, address));
  if (!row) return c.json({ error: "token não encontrado" }, 404);

  const ctx = await loadPricingContext();
  const now = Math.floor(Date.now() / 1000);
  const metrics = await computeTokenMetrics([address], ctx, now);

  // Pools que contêm o token, com liquidez em USD quando precificável.
  const tokenPools = ctx.pools.filter(
    (p) => p.token0 === address || p.token1 === address,
  );
  const price = ctx.prices.get(address) ?? null;
  const decs = ctx.decimals.get(address) ?? null;
  const poolBalances =
    tokenPools.length > 0
      ? await db
          .select()
          .from(balance)
          .where(
            and(
              eq(balance.token, address),
              inArray(
                balance.holder,
                tokenPools.map((p) => p.address),
              ),
            ),
          )
      : [];
  const balanceByPool = new Map(poolBalances.map((b) => [b.holder, b.amount]));

  // Top holders e fração do supply observado (soma dos saldos positivos).
  const topHolders = await db
    .select()
    .from(balance)
    .where(and(eq(balance.token, address), gt(balance.amount, 0n)))
    .orderBy(desc(balance.amount))
    .limit(10);
  const [supplyRow] = await db
    .select({ value: sum(balance.amount) })
    .from(balance)
    .where(and(eq(balance.token, address), gt(balance.amount, 0n)));
  const observedSupply = supplyRow?.value ? BigInt(supplyRow.value) : 0n;

  const recentTransfers = await db
    .select()
    .from(transferEvent)
    .where(eq(transferEvent.token, address))
    .orderBy(desc(transferEvent.timestamp), desc(transferEvent.id))
    .limit(20);

  const hourly = await db
    .select()
    .from(tokenHourData)
    .where(
      and(
        eq(tokenHourData.token, address),
        gte(tokenHourData.hour, now - 7 * 24 * 3600),
      ),
    )
    .orderBy(asc(tokenHourData.hour));

  const body: TokenDetailDto = {
    token: toTokenRow(
      row,
      metrics.get(address) ?? {
        priceUsd: null,
        volume24hUsd: null,
        liquidityUsd: null,
        transfers24h: 0,
      },
    ),
    pools: tokenPools.map((p) => {
      const amount = balanceByPool.get(p.address);
      return {
        address: p.address,
        token0: p.token0!,
        token1: p.token1!,
        feeTier: p.feeTier,
        swapCount: p.swapCount.toString(),
        lastSwapAt: p.lastSwapAt,
        liquidityUsd:
          price !== null && decs !== null && amount !== undefined && amount > 0n
            ? toUnits(amount, decs) * price
            : null,
      };
    }),
    topHolders: topHolders.map((h) => ({
      holder: h.holder,
      amount: h.amount.toString(),
      share:
        observedSupply > 0n
          ? Number((h.amount * 1_000_000n) / observedSupply) / 1_000_000
          : null,
    })),
    recentTransfers: recentTransfers.map((t) => ({
      from: t.from,
      to: t.to,
      amount: t.amount.toString(),
      timestamp: t.timestamp,
      blockNumber: t.blockNumber.toString(),
    })),
    hourly: hourly.map((h) => ({
      hour: h.hour,
      transferCount: h.transferCount,
      volume: h.volume.toString(),
    })),
  };
  return c.json(serialize(body) as unknown as TokenDetailDto);
});

export default app;
