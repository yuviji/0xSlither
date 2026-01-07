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

// Chain IDs from environment variables
export const BASE_MAINNET_CHAIN_ID = BigInt(import.meta.env.VITE_BASE_CHAIN_ID);
export const BASE_SEPOLIA_CHAIN_ID = BigInt(import.meta.env.VITE_BASE_SEPOLIA_CHAIN_ID);

// Base Mainnet Configuration
export const BASE_MAINNET_CONFIG: NetworkConfig = {
  chainId: BASE_MAINNET_CHAIN_ID,
  chainIdHex: '0x' + BASE_MAINNET_CHAIN_ID.toString(16),
  chainName: 'Base',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [import.meta.env.VITE_BASE_RPC_URL],
  blockExplorerUrls: [import.meta.env.VITE_BASE_EXPLORER_URL],
};

// Base Sepolia Configuration
export const BASE_SEPOLIA_CONFIG: NetworkConfig = {
  chainId: BASE_SEPOLIA_CHAIN_ID,
  chainIdHex: '0x' + BASE_SEPOLIA_CHAIN_ID.toString(16),
  chainName: 'Base Sepolia',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [import.meta.env.VITE_BASE_SEPOLIA_RPC_URL],
  blockExplorerUrls: [import.meta.env.VITE_BASE_SEPOLIA_EXPLORER_URL],
};

// ============================================================================
// NETWORK TOGGLE - Set via VITE_USE_BASE_MAINNET environment variable
// This is the single source of truth for which network the game uses
// ============================================================================
const USE_BASE_MAINNET = import.meta.env.VITE_USE_BASE_MAINNET === 'true';

// Active network configuration based on toggle
export const NETWORK_CONFIG: NetworkConfig = USE_BASE_MAINNET 
  ? BASE_MAINNET_CONFIG 
  : BASE_SEPOLIA_CONFIG;

/**
 * Check if the given chain ID matches the configured network
 */
export function isCorrectNetwork(chainId: bigint): boolean {
  return chainId === NETWORK_CONFIG.chainId;
}

/**
 * Get the parameters needed for wallet_addEthereumChain RPC call
 */
export function getAddChainParameters(config: NetworkConfig = NETWORK_CONFIG) {
  return {
    chainId: config.chainIdHex,
    chainName: config.chainName,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: config.rpcUrls,
    blockExplorerUrls: config.blockExplorerUrls,
  };
}

/**
 * Get the parameters needed for wallet_switchEthereumChain RPC call
 */
export function getSwitchChainParameters(config: NetworkConfig = NETWORK_CONFIG) {
  return {
    chainId: config.chainIdHex,
  };
}
