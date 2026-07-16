import { describe, expect, it } from "vitest";

import {
  formatCompact,
  formatUsd,
  isRwaCategory,
  shortenAddress,
  toUnits,
} from "./index";

describe("formatUsd", () => {
  it("formata valores pequenos com centavos", () => {
    expect(formatUsd(1234.56)).toBe("$1,234.56");
  });

  it("usa notação compacta acima de 1M", () => {
    expect(formatUsd(1_200_000)).toBe("$1.2M");
    expect(formatUsd(3_400_000_000)).toBe("$3.4B");
  });

  it("usa mais casas para valores abaixo de $1", () => {
    expect(formatUsd(0.1234)).toBe("$0.1234");
  });

  it("retorna — para valores não finitos", () => {
    expect(formatUsd(Number.NaN)).toBe("—");
  });
});

describe("formatCompact", () => {
  it("compacta milhares e milhões", () => {
    expect(formatCompact(1_234)).toBe("1.2K");
    expect(formatCompact(5_600_000)).toBe("5.6M");
  });
});

describe("shortenAddress", () => {
  it("encurta endereços válidos", () => {
    expect(shortenAddress("0x32353A6C91143bfd6C7d363B546e62a9A2489A20")).toBe(
      "0x3235…9A20",
    );
  });

  it("devolve a entrada quando não é um endereço", () => {
    expect(shortenAddress("abc")).toBe("abc");
  });
});

describe("isRwaCategory", () => {
  it("classifica stock/etf/stablecoin como RWA", () => {
    expect(isRwaCategory("stock")).toBe(true);
    expect(isRwaCategory("etf")).toBe(true);
    expect(isRwaCategory("stablecoin")).toBe(true);
    expect(isRwaCategory("other")).toBe(false);
    expect(isRwaCategory("unclassified")).toBe(false);
  });
});

describe("toUnits", () => {
  it("converte amounts com decimais", () => {
    expect(toUnits(1_500_000_000_000_000_000n, 18)).toBe(1.5);
  });
});
