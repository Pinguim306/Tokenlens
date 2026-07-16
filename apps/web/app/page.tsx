import { robinhoodChain } from "@tokenlens/chain";
import { registry } from "@tokenlens/registry";
import { shortenAddress } from "@tokenlens/shared";

const COLUMNS = [
  "Ativo",
  "Categoria",
  "Preço",
  "Volume 24h",
  "Liquidez",
  "Holders",
  "Tx 24h",
] as const;

export default function Home() {
  const explorerUrl = robinhoodChain.blockExplorers.default.url;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Tokenlens</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              RWA Screener da Robinhood Chain
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              {robinhoodChain.name} · chain ID {robinhoodChain.id}
            </p>
            <a
              href={explorerUrl}
              className="underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Blockscout
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column} className="px-4 py-3 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registry.tokens.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-16 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    <p className="font-medium">
                      Aguardando os primeiros dados do indexer.
                    </p>
                    <p className="mt-1 text-xs">
                      O catálogo é preenchido pela indexação on-chain (Fase 1) e
                      pela allowlist curada em{" "}
                      <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
                        packages/registry/rwa.json
                      </code>
                      .
                    </p>
                  </td>
                </tr>
              ) : (
                registry.tokens.map((token) => (
                  <tr
                    key={token.address}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">{token.symbol}</span>{" "}
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {token.name}
                      </span>
                      <a
                        href={`${explorerUrl}/token/${token.address}`}
                        className="ml-2 font-mono text-xs text-zinc-400 underline underline-offset-2"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {shortenAddress(token.address)}
                      </a>
                    </td>
                    <td className="px-4 py-3 capitalize">{token.category}</td>
                    <td className="px-4 py-3 text-zinc-400">—</td>
                    <td className="px-4 py-3 text-zinc-400">—</td>
                    <td className="px-4 py-3 text-zinc-400">—</td>
                    <td className="px-4 py-3 text-zinc-400">—</td>
                    <td className="px-4 py-3 text-zinc-400">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
          Fase 0 — fundação. Métricas de preço, volume, liquidez e holders
          chegam nas Fases 2–3 (ver PLANO.md).
        </p>
      </main>
    </div>
  );
}
