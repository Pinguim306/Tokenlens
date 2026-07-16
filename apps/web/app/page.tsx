import Link from "next/link";

import { CategoryBadge, Num, Usd } from "@/components/ui";
import { fetchTokens } from "@/lib/api";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Search = {
  view?: string;
  q?: string;
  sort?: string;
  order?: string;
  page?: string;
};

function buildQuery(base: Search, patch: Partial<Search>): string {
  const merged: Record<string, string | undefined> = { ...base, ...patch };
  const params = new URLSearchParams();
  for (const key of ["view", "q", "sort", "order", "page"] as const) {
    const value = merged[key];
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function SortHeader({
  label,
  sortKey,
  search,
}: {
  label: string;
  sortKey?: "transfers" | "holders" | "age";
  search: Search;
}) {
  if (!sortKey) {
    return <th className="px-4 py-3 font-medium">{label}</th>;
  }
  const active = (search.sort ?? "transfers") === sortKey;
  const nextOrder = active && (search.order ?? "desc") === "desc" ? "asc" : "desc";
  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={buildQuery(search, { sort: sortKey, order: nextOrder, page: undefined })}
        className={`hover:text-zinc-800 dark:hover:text-zinc-200 ${active ? "text-zinc-900 dark:text-zinc-100" : ""}`}
      >
        {label}
        {active ? ((search.order ?? "desc") === "desc" ? " ↓" : " ↑") : ""}
      </Link>
    </th>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const view = search.view === "all" ? "all" : "rwa";
  const page = Math.max(Number(search.page ?? 1) || 1, 1);
  const sort =
    search.sort === "holders" || search.sort === "age"
      ? search.sort
      : "transfers";
  const order = search.order === "asc" ? "asc" : "desc";

  const data = await fetchTokens({
    view,
    search: search.q,
    sort,
    order,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(Math.ceil(data.total / PAGE_SIZE), 1) : 1;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
          {(
            [
              ["rwa", "RWAs"],
              ["all", "Todos os tokens"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={buildQuery(search, { view: value, page: undefined })}
              className={`rounded-md px-3 py-1.5 text-sm ${
                view === value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <form method="GET" action="/" className="flex items-center gap-2">
          <input type="hidden" name="view" value={view} />
          <input
            type="search"
            name="q"
            defaultValue={search.q ?? ""}
            placeholder="Nome, ticker ou endereço…"
            className="w-64 rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <SortHeader label="Ativo" search={search} />
              <SortHeader label="Categoria" search={search} />
              <SortHeader label="Preço" search={search} />
              <SortHeader label="Volume 24h" search={search} />
              <SortHeader label="Liquidez" search={search} />
              <SortHeader label="Holders" sortKey="holders" search={search} />
              <SortHeader label="Transfers" sortKey="transfers" search={search} />
              <SortHeader label="Tx 24h" search={search} />
              <SortHeader label="Listado" sortKey="age" search={search} />
            </tr>
          </thead>
          <tbody>
            {data === null || data.tokens.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-16 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {data === null ? (
                    <>
                      <p className="font-medium">Indexer indisponível.</p>
                      <p className="mt-1 text-xs">
                        Suba o indexer com <code>pnpm dev</code> e confira{" "}
                        <code>INDEXER_URL</code>.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Nenhum token encontrado.</p>
                      <p className="mt-1 text-xs">
                        {view === "rwa"
                          ? "A visão RWA depende da allowlist em packages/registry/rwa.json e da indexação on-chain."
                          : "O catálogo é preenchido conforme a indexação avança."}
                      </p>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              data.tokens.map((t) => (
                <tr
                  key={t.address}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/token/${t.address}`}
                      className="font-medium hover:underline"
                    >
                      {t.symbol ?? "?"}
                    </Link>{" "}
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {t.name ?? ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={t.category} />
                  </td>
                  <td className="px-4 py-3">
                    <Usd value={t.priceUsd} />
                  </td>
                  <td className="px-4 py-3">
                    <Usd value={t.volume24hUsd} />
                  </td>
                  <td className="px-4 py-3">
                    <Usd value={t.liquidityUsd} />
                  </td>
                  <td className="px-4 py-3">
                    <Num value={t.holderCount} />
                  </td>
                  <td className="px-4 py-3">
                    <Num value={t.transferCount} />
                  </td>
                  <td className="px-4 py-3">
                    <Num value={t.transfers24h} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(t.firstSeenAt * 1000).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <p>
          {data
            ? `${data.total.toLocaleString("pt-BR")} tokens · página ${page} de ${totalPages}`
            : ""}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={buildQuery(search, { page: String(page - 1) })}
              className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ← Anterior
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={buildQuery(search, { page: String(page + 1) })}
              className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Próxima →
            </Link>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
        Preço, volume e liquidez são derivados dos pools indexados (stablecoins
        da allowlist como âncora de $1) e podem divergir de fontes oficiais.
        Ordenação por colunas em USD chega junto com os snapshots agregados.
      </p>
    </main>
  );
}
