import { defineChain } from "viem";

export { erc20Abi } from "viem";

export const ROBINHOOD_CHAIN_ID = 4663;

/**
 * Robinhood Chain mainnet — L2 Ethereum (Arbitrum Orbit), gas em ETH.
 * Mainnet pública desde 01/07/2026.
 */
export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

/**
 * Subconjunto da ABI de um pool Uniswap v3: o evento Swap (usado para
 * descoberta chain-wide de pools) e as views de identificação do par.
 * TODO(fase-2): suportar Uniswap v4 (PoolManager singleton, eventos por PoolId).
 */
export const uniswapV3PoolAbi = [
  {
    type: "event",
    name: "Swap",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount0", type: "int256", indexed: false },
      { name: "amount1", type: "int256", indexed: false },
      { name: "sqrtPriceX96", type: "uint160", indexed: false },
      { name: "liquidity", type: "uint128", indexed: false },
      { name: "tick", type: "int24", indexed: false },
    ],
  },
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "token1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "fee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint24" }],
  },
] as const;

// TODO(fase-0): a testnet expõe RPC em https://rpc.testnet.chain.robinhood.com
// e explorer em https://explorer.testnet.chain.robinhood.com, mas o chain ID
// ainda não foi confirmado (consultar eth_chainId). Adicionar defineChain da
// testnet quando confirmado.
export const ROBINHOOD_TESTNET_RPC_URL =
  "https://rpc.testnet.chain.robinhood.com";
