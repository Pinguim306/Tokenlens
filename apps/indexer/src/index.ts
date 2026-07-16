import { ponder } from "ponder:registry";
import {
  balance,
  chainCheckpoint,
  pool,
  poolHourData,
  swapEvent,
  token,
  tokenHourData,
  transferEvent,
} from "ponder:schema";
import { erc20Abi, zeroAddress } from "viem";

import { uniswapV3PoolAbi } from "@tokenlens/chain";
import { registryByAddress } from "@tokenlens/registry";
import { classifyCandidate, hourBucket } from "@tokenlens/shared";

/** Lê metadata ERC-20 tolerando contratos não-padrão (retorna null no revert). */
async function readTokenMetadata(
  client: { readContract: (args: any) => Promise<any> },
  address: `0x${string}`,
) {
  const read = async <T>(functionName: string): Promise<T | null> => {
    try {
      return (await client.readContract({
        abi: erc20Abi,
        address,
        functionName,
      })) as T;
    } catch {
      return null;
    }
  };
  const [name, symbol, decimals] = await Promise.all([
    read<string>("name"),
    read<string>("symbol"),
    read<number>("decimals"),
  ]);
  return { name, symbol, decimals };
}

ponder.on("ERC20:Transfer", async ({ event, context }) => {
  const tokenAddress = event.log.address.toLowerCase() as `0x${string}`;
  const { from, to, value } = event.args;
  const timestamp = Number(event.block.timestamp);

  // Descoberta: o primeiro Transfer de um contrato cria o token no catálogo,
  // com metadata on-chain e classificação (registry = camada 1, heurística de
  // símbolo = camada 2; promoção a RWA é sempre curadoria humana).
  const existing = await context.db.find(token, { address: tokenAddress });
  if (existing === null) {
    const listed = registryByAddress.get(tokenAddress);
    const metadata = await readTokenMetadata(context.client, tokenAddress);
    await context.db
      .insert(token)
      .values({
        address: tokenAddress,
        name: listed?.name ?? metadata.name,
        symbol: listed?.symbol ?? metadata.symbol,
        decimals: metadata.decimals,
        category:
          listed?.category ?? classifyCandidate(metadata.symbol, metadata.name),
        firstSeenAt: timestamp,
        firstSeenBlock: event.block.number,
        transferCount: 0n,
        holderCount: 0n,
      })
      .onConflictDoNothing();
  }

  // Saldos materializados + contagem incremental de holders.
  // Mint/burn (zeroAddress) não vira linha de balance.
  let holderDelta = 0n;
  if (from !== zeroAddress && value > 0n) {
    const prev = await context.db.find(balance, {
      token: tokenAddress,
      holder: from,
    });
    const prevAmount = prev?.amount ?? 0n;
    const nextAmount = prevAmount - value;
    if (prevAmount > 0n && nextAmount <= 0n) holderDelta -= 1n;
    await context.db
      .insert(balance)
      .values({ token: tokenAddress, holder: from, amount: -value })
      .onConflictDoUpdate((row) => ({ amount: row.amount - value }));
  }
  if (to !== zeroAddress && value > 0n) {
    const prev = await context.db.find(balance, {
      token: tokenAddress,
      holder: to,
    });
    const prevAmount = prev?.amount ?? 0n;
    if (prevAmount <= 0n && prevAmount + value > 0n) holderDelta += 1n;
    await context.db
      .insert(balance)
      .values({ token: tokenAddress, holder: to, amount: value })
      .onConflictDoUpdate((row) => ({ amount: row.amount + value }));
  }

  await context.db.update(token, { address: tokenAddress }).set((row) => ({
    transferCount: row.transferCount + 1n,
    holderCount: row.holderCount + holderDelta,
  }));

  // Atividade por (token, hora) — insumo de "tx 24h" e das séries do detalhe.
  await context.db
    .insert(tokenHourData)
    .values({
      token: tokenAddress,
      hour: hourBucket(timestamp),
      transferCount: 1,
      volume: value,
    })
    .onConflictDoUpdate((row) => ({
      transferCount: row.transferCount + 1,
      volume: row.volume + value,
    }));

  await context.db.insert(transferEvent).values({
    id: event.id,
    token: tokenAddress,
    from,
    to,
    amount: value,
    timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("UniswapV3Pool:Swap", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase() as `0x${string}`;
  const { amount0, amount1, sqrtPriceX96, tick } = event.args;
  const timestamp = Number(event.block.timestamp);

  // Descoberta de pool: qualquer contrato que emita Swap v3. token0/token1
  // identificam o par; contratos que não respondem ficam com par nulo e são
  // ignorados nas métricas.
  const existing = await context.db.find(pool, { address: poolAddress });
  if (existing === null) {
    const read = async <T>(functionName: string): Promise<T | null> => {
      try {
        return (await context.client.readContract({
          abi: uniswapV3PoolAbi,
          address: poolAddress,
          functionName,
        } as any)) as T;
      } catch {
        return null;
      }
    };
    const [token0, token1, feeTier] = await Promise.all([
      read<`0x${string}`>("token0"),
      read<`0x${string}`>("token1"),
      read<number>("fee"),
    ]);
    await context.db
      .insert(pool)
      .values({
        address: poolAddress,
        token0: token0 ? (token0.toLowerCase() as `0x${string}`) : null,
        token1: token1 ? (token1.toLowerCase() as `0x${string}`) : null,
        feeTier,
        sqrtPriceX96,
        tick,
        swapCount: 0n,
        firstSeenAt: timestamp,
        lastSwapAt: timestamp,
      })
      .onConflictDoNothing();
  }

  await context.db.update(pool, { address: poolAddress }).set((row) => ({
    sqrtPriceX96,
    tick,
    swapCount: row.swapCount + 1n,
    lastSwapAt: timestamp,
  }));

  const abs = (x: bigint) => (x < 0n ? -x : x);
  await context.db
    .insert(poolHourData)
    .values({
      pool: poolAddress,
      hour: hourBucket(timestamp),
      swapCount: 1,
      volumeAbs0: abs(amount0),
      volumeAbs1: abs(amount1),
    })
    .onConflictDoUpdate((row) => ({
      swapCount: row.swapCount + 1,
      volumeAbs0: row.volumeAbs0 + abs(amount0),
      volumeAbs1: row.volumeAbs1 + abs(amount1),
    }));

  await context.db.insert(swapEvent).values({
    id: event.id,
    pool: poolAddress,
    sender: event.args.sender,
    recipient: event.args.recipient,
    amount0,
    amount1,
    sqrtPriceX96,
    timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("ChainCheckpoint:block", async ({ event, context }) => {
  await context.db.insert(chainCheckpoint).values({
    blockNumber: event.block.number,
    timestamp: Number(event.block.timestamp),
  });
});
