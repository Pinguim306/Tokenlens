import { createConfig } from "ponder";
import { parseAbiItem } from "viem";

import { ROBINHOOD_CHAIN_ID, uniswapV3PoolAbi } from "@tokenlens/chain";

const startBlock = Number(process.env.PONDER_START_BLOCK ?? 0);

// Só o evento Transfer: mantém o filtro de logs restrito ao que indexamos.
const erc20TransferAbi = [
  parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ),
] as const;

export default createConfig({
  chains: {
    robinhood: {
      id: ROBINHOOD_CHAIN_ID,
      rpc:
        process.env.PONDER_RPC_URL_4663 ??
        "https://rpc.mainnet.chain.robinhood.com",
    },
  },
  contracts: {
    // Sem `address`: indexa eventos Transfer de TODOS os contratos da chain —
    // é assim que novos tokens são descobertos (PLANO.md §5.3).
    ERC20: {
      chain: "robinhood",
      abi: erc20TransferAbi,
      startBlock,
    },
    // Também sem `address`: qualquer contrato que emita o evento Swap do
    // Uniswap v3 é descoberto como pool — independe de conhecer a factory.
    UniswapV3Pool: {
      chain: "robinhood",
      abi: uniswapV3PoolAbi,
      startBlock,
    },
  },
  blocks: {
    // Checkpoint periódico da head da chain, usado para monitorar lag de
    // indexação e comprovar a leitura contínua de blocos (entrega da Fase 0).
    ChainCheckpoint: {
      chain: "robinhood",
      interval: 2400,
      startBlock,
    },
  },
});
