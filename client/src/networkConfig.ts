/**
 * Network Configuration for 0xSlither
 * This configuration is used to automatically add the network to MetaMask
 */

export interface NetworkConfig {
  chainId: bigint;
  chainIdHex: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

// Saga Chainlet Configuration
export const NETWORK_CONFIG: NetworkConfig = {
  chainId: 2763767854157000n,
  chainIdHex: '0x9d2e51e92f0d8', // Hex representation of 2763767854157000
  chainName: '0xSlither Saga Chainlet',
  nativeCurrency: {
    name: 'SSS',
    symbol: 'SSS',
    decimals: 18,
  },
  rpcUrls: ['https://slither-2763767854157000-1.jsonrpc.sagarpc.io'],
  blockExplorerUrls: ['https://slither-2763767854157000-1.sagaexplorer.io'],
};

/**
 * Get the parameters needed for wallet_addEthereumChain RPC call
 */
export function getAddChainParameters() {
  return {
    chainId: NETWORK_CONFIG.chainIdHex,
    chainName: NETWORK_CONFIG.chainName,
    nativeCurrency: NETWORK_CONFIG.nativeCurrency,
    rpcUrls: NETWORK_CONFIG.rpcUrls,
    blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrls,
  };
}

/**
 * Get the parameters needed for wallet_switchEthereumChain RPC call
 */
export function getSwitchChainParameters() {
  return {
    chainId: NETWORK_CONFIG.chainIdHex,
  };
}

