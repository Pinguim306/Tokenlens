import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tokenlens — RWA Screener da Robinhood Chain",
  description:
    "Índice navegável de todos os ativos tokenizados (RWAs) da Robinhood Chain: volume, liquidez, holders e atividade recente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
