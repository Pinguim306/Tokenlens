import rawRegistry from "../rwa.json";

import { registrySchema, type Registry, type RegistryToken } from "./schema";

export { registrySchema, registryTokenSchema } from "./schema";
export type { Registry, RegistryToken } from "./schema";

/** Allowlist de RWAs validada. Lança na importação se o rwa.json for inválido. */
export const registry: Registry = registrySchema.parse(rawRegistry);

/** Índice por endereço (lowercase) para lookup O(1) na classificação. */
export const registryByAddress: ReadonlyMap<`0x${string}`, RegistryToken> =
  new Map(registry.tokens.map((t) => [t.address, t]));
