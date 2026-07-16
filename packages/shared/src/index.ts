/**
 * Categorias de classificação dos tokens da chain (seção 5.3 do PLANO.md).
 * A visão padrão do screener mostra apenas as categorias RWA.
 */
export const TOKEN_CATEGORIES = [
  "stock",
  "etf",
  "stablecoin",
  "candidate",
  "other",
  "unclassified",
] as const;

export type TokenCategory = (typeof TOKEN_CATEGORIES)[number];

export const RWA_CATEGORIES: readonly TokenCategory[] = [
  "stock",
  "etf",
  "stablecoin",
];

export function isRwaCategory(category: TokenCategory): boolean {
  return RWA_CATEGORIES.includes(category);
}

/** Formata um valor em USD: $1,234.56 / $1.2M / $3.4B. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${formatCompact(value)}`;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: abs < 1 ? 4 : 2,
  });
}

/** Formata número grande de forma compacta: 1.2K, 3.4M, 5.6B. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Encurta um endereço EVM: 0x1234…abcd. */
export function shortenAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Converte um amount bruto de token (bigint) para número, dado os decimais. */
export function toUnits(amount: bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}
