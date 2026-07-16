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

// TODO(fase-0): a testnet expõe RPC em https://rpc.testnet.chain.robinhood.com
// e explorer em https://explorer.testnet.chain.robinhood.com, mas o chain ID
// ainda não foi confirmado (consultar eth_chainId). Adicionar defineChain da
// testnet quando confirmado.
export const ROBINHOOD_TESTNET_RPC_URL =
  "https://rpc.testnet.chain.robinhood.com";
