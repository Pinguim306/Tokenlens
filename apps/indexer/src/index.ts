import { ponder } from "ponder:registry";
import { balance, chainCheckpoint, token, transferEvent } from "ponder:schema";
import { zeroAddress } from "viem";

import { registryByAddress } from "@tokenlens/registry";

ponder.on("ERC20:Transfer", async ({ event, context }) => {
  const tokenAddress = event.log.address.toLowerCase() as `0x${string}`;
  const { from, to, value } = event.args;

  // Descoberta: o primeiro Transfer de um contrato cria o token no catálogo.
  // Se estiver na allowlist do registry, já nasce classificado (camada 1);
  // metadata on-chain (name/symbol/decimals) é enriquecida na Fase 1.
  const listed = registryByAddress.get(tokenAddress);
  await context.db
    .insert(token)
    .values({
      address: tokenAddress,
      name: listed?.name,
      symbol: listed?.symbol,
      category: listed?.category ?? "unclassified",
      firstSeenAt: Number(event.block.timestamp),
      firstSeenBlock: event.block.number,
      transferCount: 1n,
    })
    .onConflictDoUpdate((row) => ({
      transferCount: row.transferCount + 1n,
    }));

  // Saldos materializados; mint/burn (zeroAddress) não vira linha de balance.
  if (from !== zeroAddress) {
    await context.db
      .insert(balance)
      .values({ token: tokenAddress, holder: from, amount: -value })
      .onConflictDoUpdate((row) => ({ amount: row.amount - value }));
  }
  if (to !== zeroAddress) {
    await context.db
      .insert(balance)
      .values({ token: tokenAddress, holder: to, amount: value })
      .onConflictDoUpdate((row) => ({ amount: row.amount + value }));
  }

  await context.db.insert(transferEvent).values({
    id: event.id,
    token: tokenAddress,
    from,
    to,
    amount: value,
    timestamp: Number(event.block.timestamp),
    blockNumber: event.block.number,
  });
});

ponder.on("ChainCheckpoint:block", async ({ event, context }) => {
  await context.db.insert(chainCheckpoint).values({
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});
