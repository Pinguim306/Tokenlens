/**
 * Funções puras de cálculo de métricas (PLANO.md §5.2).
 * Sem I/O: recebem linhas do banco e devolvem valores — testáveis em isolamento.
 */

/** Bucket horário (epoch segundos) de um timestamp. */
export function hourBucket(timestamp: number): number {
  return Math.floor(timestamp / 3600) * 3600;
}

const Q96 = 2 ** 96;

/**
 * Preço de 1 token0 em unidades de token1, a partir do sqrtPriceX96 de um
 * pool Uniswap v3 (sqrtPriceX96 = sqrt(token1_raw/token0_raw) * 2^96).
 */
export function priceToken0InToken1(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
): number {
  const ratio = Number(sqrtPriceX96) / Q96;
  return ratio * ratio * 10 ** (decimals0 - decimals1);
}

/** Preço de 1 token1 em unidades de token0. */
export function priceToken1InToken0(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
): number {
  const p = priceToken0InToken1(sqrtPriceX96, decimals0, decimals1);
  return p === 0 ? 0 : 1 / p;
}

/** Visão mínima de um pool usada no cálculo de preços USD. */
export interface PricingPool {
  address: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  decimals0: number;
  decimals1: number;
  sqrtPriceX96: bigint;
  /** Proxy de profundidade para escolher o melhor pool (ex.: swapCount). */
  weight: number;
}

/**
 * Deriva preços USD por token a partir do grafo de pools:
 * 1. stablecoins valem $1 por definição;
 * 2. tokens com pool direto contra stablecoin usam o pool de maior peso;
 * 3. tokens com pool contra um token já precificado (ex.: WETH) roteiam por ele.
 * Roda em passes até estabilizar (profundidade máxima = pools.length).
 */
export function computeUsdPrices(
  pools: readonly PricingPool[],
  stableAddresses: ReadonlySet<string>,
): Map<`0x${string}`, number> {
  const prices = new Map<`0x${string}`, number>();
  for (const stable of stableAddresses) {
    prices.set(stable.toLowerCase() as `0x${string}`, 1);
  }

  // Melhor pool por (token não-precificado, contraparte) — maior peso vence.
  const sorted = [...pools].sort((a, b) => b.weight - a.weight);

  let changed = true;
  let guard = pools.length + 1;
  while (changed && guard-- > 0) {
    changed = false;
    for (const pool of sorted) {
      const p0 = prices.get(pool.token0);
      const p1 = prices.get(pool.token1);
      if (p0 !== undefined && p1 === undefined) {
        const inToken0 = priceToken1InToken0(
          pool.sqrtPriceX96,
          pool.decimals0,
          pool.decimals1,
        );
        if (Number.isFinite(inToken0) && inToken0 > 0) {
          prices.set(pool.token1, inToken0 * p0);
          changed = true;
        }
      } else if (p1 !== undefined && p0 === undefined) {
        const inToken1 = priceToken0InToken1(
          pool.sqrtPriceX96,
          pool.decimals0,
          pool.decimals1,
        );
        if (Number.isFinite(inToken1) && inToken1 > 0) {
          prices.set(pool.token0, inToken1 * p1);
          changed = true;
        }
      }
    }
  }
  return prices;
}

/**
 * Heurística de classificação (camada 2 — PLANO.md §5.3): stock tokens da
 * Robinhood usam ticker com sufixo "x" (ex.: AAPLx). Marca como "candidate"
 * para revisão humana; nunca promove direto a RWA.
 */
export function classifyCandidate(
  symbol: string | null | undefined,
  name: string | null | undefined,
): "candidate" | "unclassified" {
  if (symbol && /^[A-Z]{1,6}x$/.test(symbol)) return "candidate";
  if (name && /\b(stock|etf) token\b/i.test(name)) return "candidate";
  return "unclassified";
}
