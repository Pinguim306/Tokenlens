import { z } from "zod";

import { RWA_CATEGORIES, type TokenCategory } from "@tokenlens/shared";

const evmAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "endereço EVM inválido")
  .transform((a) => a.toLowerCase() as `0x${string}`);

/** Uma entrada curada da allowlist de RWAs. */
export const registryTokenSchema = z.object({
  address: evmAddress,
  /** Ticker on-chain (ex.: "AAPLx"). */
  symbol: z.string().min(1),
  name: z.string().min(1),
  /** Apenas categorias RWA entram na allowlist. */
  category: z.enum(
    RWA_CATEGORIES as readonly [TokenCategory, ...TokenCategory[]],
  ),
  /** Ticker do ativo subjacente no mercado tradicional (ex.: "AAPL"). */
  underlyingTicker: z.string().min(1).optional(),
  issuer: z.string().min(1).optional(),
  /** URL da fonte que comprova a listagem (docs da Robinhood, explorer etc.). */
  source: z.url().optional(),
});

export const registrySchema = z
  .object({
    $comment: z.string().optional(),
    chainId: z.literal(4663),
    tokens: z.array(registryTokenSchema),
  })
  .refine(
    (r) => new Set(r.tokens.map((t) => t.address)).size === r.tokens.length,
    { message: "endereços duplicados no registry" },
  );

export type RegistryToken = z.infer<typeof registryTokenSchema>;
export type Registry = z.infer<typeof registrySchema>;
