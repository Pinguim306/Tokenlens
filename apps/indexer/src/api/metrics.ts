import { db } from "ponder:api";
import { balance, pool, poolHourData, token, tokenHourData } from "ponder:schema";
import { and, desc, eq, gte, inArray, isNotNull } from "ponder";

import {
  computeUsdPrices,
  toUnits,
  type PricingPool,
} from "@tokenlens/shared";

const PRICING_POOL_LIMIT = 1000;

export interface PricingContext {
  /** Preço USD por endereço de token (lowercase). */
  prices: Map<`0x${string}`, number>;
  /** Pools com par identificado, ordenados por swapCount. */
  pools: (typeof pool.$inferSelect)[];
  /** decimals por endereço de token. */
  decimals: Map<`0x${string}`, number>;
}

/**
 * Monta o grafo de preços a partir dos pools mais ativos: stablecoins da
 * allowlist valem $1 e o resto é roteado por elas (PLANO.md §5.2).
 */
export async function loadPricingContext(): Promise<PricingContext> {
  const pools = await db
    .select()
    .from(pool)
    .where(and(isNotNull(pool.token0), isNotNull(pool.token1)))
    .orderBy(desc(pool.swapCount))
    .limit(PRICING_POOL_LIMIT);

  const tokenAddresses = [
    ...new Set(pools.flatMap((p) => [p.token0!, p.token1!])),
  ];

  const decimals = new Map<`0x${string}`, number>();
  if (tokenAddresses.length > 0) {
    const rows = await db
      .select({ address: token.address, decimals: token.decimals })
      .from(token)
      .where(inArray(token.address, tokenAddresses));
    for (const row of rows) {
      if (row.decimals !== null) decimals.set(row.address, row.decimals);
    }
  }

  const stableRows = await db
    .select({ address: token.address })
    .from(token)
    .where(eq(token.category, "stablecoin"));
  const stables = new Set<string>(stableRows.map((r) => r.address));

  const pricingPools: PricingPool[] = [];
  for (const p of pools) {
    const d0 = decimals.get(p.token0!);
    const d1 = decimals.get(p.token1!);
    if (d0 === undefined || d1 === undefined) continue;
    pricingPools.push({
      address: p.address,
      token0: p.token0!,
      token1: p.token1!,
      decimals0: d0,
      decimals1: d1,
      sqrtPriceX96: p.sqrtPriceX96,
      weight: Number(p.swapCount),
    });
  }

  return { prices: computeUsdPrices(pricingPools, stables), pools, decimals };
}

export interface TokenMetrics {
  priceUsd: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  transfers24h: number;
}

/**
 * Calcula métricas USD para um conjunto de tokens (uma página do screener):
 * volume 24h a partir de poolHourData, liquidez a partir dos saldos dos
 * pools, atividade a partir de tokenHourData.
 */
export async function computeTokenMetrics(
  addresses: `0x${string}`[],
  ctx: PricingContext,
  nowSeconds: number,
): Promise<Map<`0x${string}`, TokenMetrics>> {
  const result = new Map<`0x${string}`, TokenMetrics>();
  if (addresses.length === 0) return result;

  const addressSet = new Set(addresses);
  const cutoff24h = nowSeconds - 24 * 3600;

  // Pools que contêm algum dos tokens da página.
  const relevantPools = ctx.pools.filter(
    (p) =>
      (p.token0 && addressSet.has(p.token0)) ||
      (p.token1 && addressSet.has(p.token1)),
  );
  const poolAddresses = relevantPools.map((p) => p.address);

  const hourRows =
    poolAddresses.length > 0
      ? await db
          .select()
          .from(poolHourData)
          .where(
            and(
              inArray(poolHourData.pool, poolAddresses),
              gte(poolHourData.hour, cutoff24h),
            ),
          )
      : [];
  const poolByAddress = new Map(relevantPools.map((p) => [p.address, p]));

  // Liquidez: saldos dos tokens da página em posse dos pools relevantes.
  const balanceRows =
    poolAddresses.length > 0
      ? await db
          .select()
          .from(balance)
          .where(
            and(
              inArray(balance.token, addresses),
              inArray(balance.holder, poolAddresses),
            ),
          )
      : [];

  const activityRows = await db
    .select()
    .from(tokenHourData)
    .where(
      and(
        inArray(tokenHourData.token, addresses),
        gte(tokenHourData.hour, cutoff24h),
      ),
    );

  for (const address of addresses) {
    const price = ctx.prices.get(address) ?? null;
    const decs = ctx.decimals.get(address) ?? null;

    let volume24hUsd: number | null = null;
    let liquidityUsd: number | null = null;
    if (price !== null && decs !== null) {
      volume24hUsd = 0;
      for (const row of hourRows) {
        const p = poolByAddress.get(row.pool);
        if (!p) continue;
        // volume atribuído ao lado do próprio token, evitando dupla contagem
        if (p.token0 === address) {
          volume24hUsd += toUnits(row.volumeAbs0, decs) * price;
        } else if (p.token1 === address) {
          volume24hUsd += toUnits(row.volumeAbs1, decs) * price;
        }
      }
      liquidityUsd = 0;
      for (const row of balanceRows) {
        if (row.token !== address || row.amount <= 0n) continue;
        liquidityUsd += toUnits(row.amount, decs) * price;
      }
    }

    let transfers24h = 0;
    for (const row of activityRows) {
      if (row.token === address) transfers24h += row.transferCount;
    }

    result.set(address, { priceUsd: price, volume24hUsd, liquidityUsd, transfers24h });
  }

  return result;
}
