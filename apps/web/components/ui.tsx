import { robinhoodChain } from "@tokenlens/chain";
import {
  formatCompact,
  formatUsd,
  isRwaCategory,
  shortenAddress,
  type TokenCategory,
} from "@tokenlens/shared";

export const EXPLORER_URL = robinhoodChain.blockExplorers.default.url;

const CATEGORY_LABELS: Record<TokenCategory, string> = {
  stock: "Ação",
  etf: "ETF",
  stablecoin: "Stablecoin",
  candidate: "Candidato",
  other: "Outro",
  unclassified: "Não classificado",
};

export function CategoryBadge({ category }: { category: TokenCategory }) {
  const rwa = isRwaCategory(category);
  const tone = rwa
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    : category === "candidate"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

export function Usd({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
  }
  return <span className="tabular-nums">{formatUsd(value)}</span>;
}

export function Num({ value }: { value: number | string | null }) {
  if (value === null) {
    return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
  }
  return <span className="tabular-nums">{formatCompact(Number(value))}</span>;
}

export function AddressLink({
  address,
  kind = "address",
}: {
  address: string;
  kind?: "address" | "token";
}) {
  return (
    <a
      href={`${EXPLORER_URL}/${kind}/${address}`}
      className="font-mono text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      target="_blank"
      rel="noopener noreferrer"
    >
      {shortenAddress(address)}
    </a>
  );
}

/** Gráfico de barras minimalista em SVG puro (sem dependências). */
export function BarChart({
  points,
  width = 640,
  height = 120,
  label,
}: {
  points: { x: number; y: number }[];
  width?: number;
  height?: number;
  label: string;
}) {
  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
        Sem dados no período.
      </p>
    );
  }
  const max = Math.max(...points.map((p) => p.y), 1);
  const barWidth = width / points.length;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-28 w-full"
      role="img"
      aria-label={label}
    >
      {points.map((p, i) => {
        const h = Math.max((p.y / max) * (height - 4), p.y > 0 ? 2 : 0);
        return (
          <rect
            key={p.x}
            x={i * barWidth + barWidth * 0.15}
            y={height - h}
            width={barWidth * 0.7}
            height={h}
            rx={1}
            className="fill-emerald-500/70 dark:fill-emerald-400/60"
          />
        );
      })}
    </svg>
  );
}

export function timeAgo(timestamp: number, nowMs: number): string {
  const seconds = Math.max(Math.floor(nowMs / 1000) - timestamp, 0);
  if (seconds < 60) return `${seconds}s atrás`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return `${Math.floor(seconds / 86400)}d atrás`;
}
