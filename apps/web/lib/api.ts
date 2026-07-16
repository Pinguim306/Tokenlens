import type {
  StatusDto,
  TokenDetailDto,
  TokensResponseDto,
} from "@tokenlens/shared";

const INDEXER_URL = process.env.INDEXER_URL ?? "http://localhost:42069";

/**
 * GET na API do indexer. Retorna null quando o indexer está fora do ar —
 * as páginas degradam para o estado vazio em vez de quebrar.
 */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${INDEXER_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface TokensQuery {
  view: "rwa" | "all";
  search?: string;
  sort?: "transfers" | "holders" | "age";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchTokens(
  query: TokensQuery,
): Promise<TokensResponseDto | null> {
  const pageSize = query.pageSize ?? 25;
  const params = new URLSearchParams({
    view: query.view,
    sort: query.sort ?? "transfers",
    order: query.order ?? "desc",
    limit: String(pageSize),
    offset: String(((query.page ?? 1) - 1) * pageSize),
  });
  if (query.search) params.set("search", query.search);
  return get<TokensResponseDto>(`/api/tokens?${params}`);
}

export async function fetchTokenDetail(
  address: string,
): Promise<TokenDetailDto | null> {
  return get<TokenDetailDto>(`/api/tokens/${address}`);
}

export async function fetchStatus(): Promise<StatusDto | null> {
  return get<StatusDto>("/api/status");
}
