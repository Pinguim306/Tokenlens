import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { registryByAddress } from "@tokenlens/registry";
import { formatCompact, toUnits } from "@tokenlens/shared";

import {
  AddressLink,
  BarChart,
  CategoryBadge,
  Num,
  Usd,
  timeAgo,
} from "@/components/ui";
import { fetchTokenDetail } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { address: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { address } = await params;
  const detail = await fetchTokenDetail(address);
  const label = detail?.token.symbol ?? detail?.token.name ?? address;
  return { title: label };
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{children}</p>
    </div>
  );
}

export default async function TokenPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { address } = await params;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) notFound();

  const detail = await fetchTokenDetail(address.toLowerCase());
  if (detail === null) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-16 text-center text-zinc-500 dark:text-zinc-400">
        <p className="font-medium">Token não encontrado (ou indexer offline).</p>
        <Link href="/" className="mt-2 inline-block text-sm underline">
          ← Voltar ao screener
        </Link>
      </main>
    );
  }

  const { token, pools, topHolders, recentTransfers, hourly } = detail;
  const listed = registryByAddress.get(
    token.address.toLowerCase() as `0x${string}`,
  );
  const now = Date.now();
  const decimals = token.decimals;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <Link
        href="/"
        className="text-sm text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
      >
        ← Screener
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          {token.symbol ?? "?"}
        </h2>
        <span className="text-zinc-500 dark:text-zinc-400">{token.name}</span>
        <CategoryBadge category={token.category} />
        <AddressLink address={token.address} kind="token" />
      </div>

      {listed && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {listed.underlyingTicker && (
            <>
              Ativo subjacente:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {listed.underlyingTicker}
              </span>
              {" · "}
            </>
          )}
          {listed.issuer && <>Emissor: {listed.issuer} · </>}
          {listed.source && (
            <a
              href={listed.source}
              className="underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              fonte da listagem
            </a>
          )}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Preço">
          <Usd value={token.priceUsd} />
        </Stat>
        <Stat label="Volume 24h">
          <Usd value={token.volume24hUsd} />
        </Stat>
        <Stat label="Liquidez">
          <Usd value={token.liquidityUsd} />
        </Stat>
        <Stat label="Holders">
          <Num value={token.holderCount} />
        </Stat>
        <Stat label="Transfers">
          <Num value={token.transferCount} />
        </Stat>
        <Stat label="Tx 24h">
          <Num value={token.transfers24h} />
        </Stat>
      </div>

      <section className="mt-8">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Transferências por hora (7d)
        </h3>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <BarChart
            points={hourly.map((h) => ({ x: h.hour, y: h.transferCount }))}
            label={`Transferências por hora de ${token.symbol ?? token.address}`}
          />
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Top holders
          </h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Endereço</th>
                  <th className="px-4 py-2 font-medium">Saldo</th>
                  <th className="px-4 py-2 font-medium">% observado</th>
                </tr>
              </thead>
              <tbody>
                {topHolders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500"
                    >
                      Sem holders indexados.
                    </td>
                  </tr>
                ) : (
                  topHolders.map((h) => (
                    <tr
                      key={h.holder}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                    >
                      <td className="px-4 py-2">
                        <AddressLink address={h.holder} />
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {decimals !== null
                          ? formatCompact(toUnits(BigInt(h.amount), decimals))
                          : h.amount}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {h.share !== null ? `${(h.share * 100).toFixed(2)}%` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Pools de liquidez
          </h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Pool</th>
                  <th className="px-4 py-2 font-medium">Fee</th>
                  <th className="px-4 py-2 font-medium">Swaps</th>
                  <th className="px-4 py-2 font-medium">Liquidez (lado)</th>
                  <th className="px-4 py-2 font-medium">Último swap</th>
                </tr>
              </thead>
              <tbody>
                {pools.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500"
                    >
                      Nenhum pool descoberto para este token.
                    </td>
                  </tr>
                ) : (
                  pools.map((p) => (
                    <tr
                      key={p.address}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                    >
                      <td className="px-4 py-2">
                        <AddressLink address={p.address} />
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {p.feeTier !== null
                          ? `${(p.feeTier / 10_000).toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Num value={p.swapCount} />
                      </td>
                      <td className="px-4 py-2">
                        <Usd value={p.liquidityUsd} />
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {p.lastSwapAt !== null ? timeAgo(p.lastSwapAt, now) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Transferências recentes
        </h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">De</th>
                <th className="px-4 py-2 font-medium">Para</th>
                <th className="px-4 py-2 font-medium">Quantidade</th>
                <th className="px-4 py-2 font-medium">Quando</th>
                <th className="px-4 py-2 font-medium">Bloco</th>
              </tr>
            </thead>
            <tbody>
              {recentTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500"
                  >
                    Sem transferências indexadas.
                  </td>
                </tr>
              ) : (
                recentTransfers.map((t, i) => (
                  <tr
                    key={`${t.blockNumber}-${i}`}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="px-4 py-2">
                      <AddressLink address={t.from} />
                    </td>
                    <td className="px-4 py-2">
                      <AddressLink address={t.to} />
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {decimals !== null
                        ? formatCompact(toUnits(BigInt(t.amount), decimals))
                        : t.amount}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {timeAgo(t.timestamp, now)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                      {t.blockNumber}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
