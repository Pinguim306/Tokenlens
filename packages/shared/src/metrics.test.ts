import { describe, expect, it } from "vitest";

import {
  classifyCandidate,
  computeUsdPrices,
  hourBucket,
  priceToken0InToken1,
  priceToken1InToken0,
  type PricingPool,
} from "./metrics";

const Q96 = 2n ** 96n;

const A = "0x000000000000000000000000000000000000000a" as const;
const B = "0x000000000000000000000000000000000000000b" as const;
const STABLE = "0x000000000000000000000000000000000000000c" as const;
const WETH = "0x000000000000000000000000000000000000000e" as const;

function pool(overrides: Partial<PricingPool> & Pick<PricingPool, "address" | "token0" | "token1">): PricingPool {
  return {
    decimals0: 18,
    decimals1: 18,
    sqrtPriceX96: Q96,
    weight: 1,
    ...overrides,
  };
}

describe("hourBucket", () => {
  it("trunca para a hora cheia", () => {
    expect(hourBucket(3_600)).toBe(3_600);
    expect(hourBucket(3_599)).toBe(0);
    expect(hourBucket(7_250)).toBe(7_200);
  });
});

describe("priceToken0InToken1 / priceToken1InToken0", () => {
  it("sqrtPriceX96 = 2^96 com decimais iguais → preço 1:1", () => {
    expect(priceToken0InToken1(Q96, 18, 18)).toBeCloseTo(1);
    expect(priceToken1InToken0(Q96, 18, 18)).toBeCloseTo(1);
  });

  it("sqrtPriceX96 = 2 * 2^96 → 1 token0 vale 4 token1", () => {
    expect(priceToken0InToken1(2n * Q96, 18, 18)).toBeCloseTo(4);
    expect(priceToken1InToken0(2n * Q96, 18, 18)).toBeCloseTo(0.25);
  });

  it("ajusta diferença de decimais (token1 com 6 casas)", () => {
    // raw ratio 1:1, mas token0 tem 18 casas e token1 tem 6:
    // 1 token0 (1e18 raw) ≈ 1e18 raw de token1 = 1e12 tokens1
    expect(priceToken0InToken1(Q96, 18, 6)).toBeCloseTo(1e12);
  });
});

describe("computeUsdPrices", () => {
  it("stablecoins valem $1", () => {
    const prices = computeUsdPrices([], new Set([STABLE]));
    expect(prices.get(STABLE)).toBe(1);
  });

  it("precifica token com pool direto contra a stablecoin", () => {
    // pool A/STABLE com preço 1 A = 4 STABLE
    const prices = computeUsdPrices(
      [pool({ address: "0x0000000000000000000000000000000000000001", token0: A, token1: STABLE, sqrtPriceX96: 2n * Q96 })],
      new Set([STABLE]),
    );
    expect(prices.get(A)).toBeCloseTo(4);
  });

  it("roteia por token intermediário (B → A → STABLE)", () => {
    const prices = computeUsdPrices(
      [
        // 1 A = 4 STABLE
        pool({ address: "0x0000000000000000000000000000000000000001", token0: A, token1: STABLE, sqrtPriceX96: 2n * Q96 }),
        // 1 B = 1 A (então 1 B = $4)
        pool({ address: "0x0000000000000000000000000000000000000002", token0: B, token1: A }),
      ],
      new Set([STABLE]),
    );
    expect(prices.get(B)).toBeCloseTo(4);
  });

  it("usa o pool de maior peso quando há mais de uma rota", () => {
    const prices = computeUsdPrices(
      [
        // rota fraca: 1 A = 1 STABLE
        pool({ address: "0x0000000000000000000000000000000000000001", token0: A, token1: STABLE, weight: 1 }),
        // rota forte: 1 A = 4 STABLE
        pool({ address: "0x0000000000000000000000000000000000000002", token0: A, token1: STABLE, sqrtPriceX96: 2n * Q96, weight: 10 }),
      ],
      new Set([STABLE]),
    );
    expect(prices.get(A)).toBeCloseTo(4);
  });

  it("token sem rota até stablecoin fica sem preço", () => {
    const prices = computeUsdPrices(
      [pool({ address: "0x0000000000000000000000000000000000000001", token0: A, token1: WETH })],
      new Set([STABLE]),
    );
    expect(prices.get(A)).toBeUndefined();
  });
});

describe("classifyCandidate", () => {
  it("símbolo com sufixo x vira candidato (padrão dos stock tokens)", () => {
    expect(classifyCandidate("AAPLx", null)).toBe("candidate");
    expect(classifyCandidate("HOODx", null)).toBe("candidate");
  });

  it("nome com 'Stock Token' vira candidato", () => {
    expect(classifyCandidate(null, "Apple Stock Token")).toBe("candidate");
    expect(classifyCandidate(null, "Vanguard ETF Token")).toBe("candidate");
  });

  it("demais tokens ficam unclassified", () => {
    expect(classifyCandidate("PEPE", "Pepe")).toBe("unclassified");
    expect(classifyCandidate("WETHx2", null)).toBe("unclassified");
    expect(classifyCandidate(null, null)).toBe("unclassified");
  });
});
