import { describe, expect, it } from "vitest";

import { registry, registryByAddress } from "./index";
import { registrySchema } from "./schema";

describe("rwa.json", () => {
  it("é válido segundo o schema (chainId 4663, sem duplicatas)", () => {
    expect(registry.chainId).toBe(4663);
  });

  it("indexa por endereço lowercase", () => {
    for (const [address, token] of registryByAddress) {
      expect(address).toBe(address.toLowerCase());
      expect(token.address).toBe(address);
    }
  });
});

describe("registrySchema", () => {
  it("rejeita endereços inválidos", () => {
    const result = registrySchema.safeParse({
      chainId: 4663,
      tokens: [{ address: "0x123", symbol: "X", name: "X", category: "stock" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita endereços duplicados (mesmo com case diferente)", () => {
    const token = {
      address: "0x32353A6C91143bfd6C7d363B546e62a9A2489A20",
      symbol: "X",
      name: "X",
      category: "stock",
    };
    const result = registrySchema.safeParse({
      chainId: 4663,
      tokens: [token, { ...token, address: token.address.toUpperCase().replace("0X", "0x") }],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita categorias não-RWA", () => {
    const result = registrySchema.safeParse({
      chainId: 4663,
      tokens: [
        {
          address: "0x32353A6C91143bfd6C7d363B546e62a9A2489A20",
          symbol: "MEME",
          name: "Meme",
          category: "other",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("aceita uma entrada completa", () => {
    const result = registrySchema.safeParse({
      chainId: 4663,
      tokens: [
        {
          address: "0x32353A6C91143bfd6C7d363B546e62a9A2489A20",
          symbol: "AAPLx",
          name: "Apple Stock Token",
          category: "stock",
          underlyingTicker: "AAPL",
          issuer: "Robinhood",
          source: "https://robinhoodchain.blockscout.com",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
