import type { TokenCategory } from "./index";

/**
 * DTOs da API do indexer (bigints serializados como string).
 * Compartilhados entre apps/indexer (produtor) e apps/web (consumidor).
 */

export interface TokenRowDto {
  address: `0x${string}`;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  category: TokenCategory;
  /** Preço USD derivado do grafo de pools; null quando não roteável. */
  priceUsd: number | null;
  /** Volume de swaps em USD nas últimas 24h; null sem preço. */
  volume24hUsd: number | null;
  /** TVL (USD) somado dos pools que contêm o token; null sem preço. */
  liquidityUsd: number | null;
  holderCount: string;
  transferCount: string;
  /** Transferências nas últimas 24h. */
  transfers24h: number;
  firstSeenAt: number;
}

export interface TokensResponseDto {
  tokens: TokenRowDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface PoolDto {
  address: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  feeTier: number | null;
  swapCount: string;
  lastSwapAt: number | null;
  liquidityUsd: number | null;
}

export interface HolderDto {
  holder: `0x${string}`;
  amount: string;
  /** Fração do supply em circulação observado (0–1); null sem decimals. */
  share: number | null;
}

export interface TransferDto {
  from: `0x${string}`;
  to: `0x${string}`;
  amount: string;
  timestamp: number;
  blockNumber: string;
}

export interface HourPointDto {
  hour: number;
  transferCount: number;
  /** Volume bruto transferido (raw, string de bigint). */
  volume: string;
}

export interface TokenDetailDto {
  token: TokenRowDto;
  pools: PoolDto[];
  topHolders: HolderDto[];
  recentTransfers: TransferDto[];
  /** Série horária dos últimos 7 dias. */
  hourly: HourPointDto[];
}

export interface StatusDto {
  latestBlock: string | null;
  latestBlockTimestamp: number | null;
  tokenCount: number;
  poolCount: number;
}
