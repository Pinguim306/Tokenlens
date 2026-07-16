import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { robinhoodChain } from "@tokenlens/chain";

import { fetchStatus } from "@/lib/api";
import { EXPLORER_URL } from "@/components/ui";

export const metadata: Metadata = {
  title: {
    default: "Tokenlens — RWA Screener da Robinhood Chain",
    template: "%s · Tokenlens",
  },
  description:
    "Índice navegável de todos os ativos tokenizados (RWAs) da Robinhood Chain: volume, liquidez, holders e atividade recente.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const status = await fetchStatus();

  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="group">
              <h1 className="text-xl font-semibold tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Tokenlens
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                RWA Screener da Robinhood Chain
              </p>
            </Link>
            <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
              <p>
                {robinhoodChain.name} · chain ID {robinhoodChain.id}
              </p>
              <a
                href={EXPLORER_URL}
                className="underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                Blockscout
              </a>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              {status === null ? (
                <span>
                  Indexer offline — dados indisponíveis no momento.
                </span>
              ) : (
                <span>
                  {status.tokenCount.toLocaleString("pt-BR")} tokens ·{" "}
                  {status.poolCount.toLocaleString("pt-BR")} pools
                  {status.latestBlock !== null &&
                    ` · bloco ${status.latestBlock}`}
                </span>
              )}
            </p>
            <p>
              dados on-chain via indexação própria ·{" "}
              <a
                href="https://github.com/Pinguim306/Tokenlens"
                className="underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                código
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
