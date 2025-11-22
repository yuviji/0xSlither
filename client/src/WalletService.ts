import { ethers } from 'ethers';

// Contract ABIs (minimal, only what we need)
const STAKE_ARENA_ABI = [
  'function enterMatch(bytes32 matchId) external payable',
  'function tapOut(bytes32 matchId) external',
  'function getLeaderboard() external view returns (tuple(address player, uint256 score)[])',
  'function bestScore(address player) external view returns (uint256)',
  'function getStake(bytes32 matchId, address player) external view returns (uint256)',
  'function isActive(bytes32 matchId, address player) external view returns (bool)',
];

interface LeaderboardEntry {
  player: string;
  score: bigint;
}

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private address: string | null = null;
  private stakeArena: ethers.Contract | null = null;

  async connectWallet(): Promise<string | null> {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        console.error('MetaMask not detected');
        return null;
      }

      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await this.provider.send('eth_requestAccounts', []);
      this.address = accounts[0];
      
      this.signer = await this.provider.getSigner();
      
      // Check if we're on the right network
      const network = await this.provider.getNetwork();
      const sagaChainId = 2763767854157000n;
      
      if (network.chainId !== sagaChainId) {
        console.log('Switching to Saga Chainlet...');
        try {
          await this.provider.send('wallet_switchEthereumChain', [
            { chainId: `0x${sagaChainId.toString(16)}` }
          ]);
        } catch (switchError: any) {
          // If chain not added, add it
          if (switchError.code === 4902) {
            await this.provider.send('wallet_addEthereumChain', [{
              chainId: `0x${sagaChainId.toString(16)}`,
              chainName: '0xSlither Saga Chainlet',
              nativeCurrency: {
                name: 'SSS',
                symbol: 'SSS',
                decimals: 18
              },
              rpcUrls: ['https://slither-2763767854157000-1.jsonrpc.sagarpc.io'],
              blockExplorerUrls: ['https://slither-2763767854157000-1.sagaexplorer.io']
            }]);
          } else {
            throw switchError;
          }
        }
      }

      console.log('Wallet connected:', this.address);
      console.log('Using native SSS token');
      return this.address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return null;
    }
  }

  initializeContracts(stakeArenaAddress: string): void {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    this.stakeArena = new ethers.Contract(stakeArenaAddress, STAKE_ARENA_ABI, this.signer);
    
    console.log('Contracts initialized');
    console.log('StakeArena:', stakeArenaAddress);
    console.log('Using native SSS token (no approval needed)');
  }

  async getTokenBalance(): Promise<string> {
    if (!this.address || !this.provider) return '0';
    
    try {
      // Get native SSS balance
      const balance: bigint = await this.provider.getBalance(this.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting SSS balance:', error);
      return '0';
    }
  }

  async enterMatch(matchId: string, amount: string): Promise<boolean> {
    if (!this.stakeArena) {
      console.error('StakeArena not initialized');
      throw new Error('StakeArena not initialized');
    }
    console.log('Entering match', matchId, amount);
    try {
      const amountWei = ethers.parseEther(amount);
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      console.log('Amount in wei:', amountWei);
      console.log('Match ID as bytes32:', matchIdBytes32);
      console.log(`Entering match ${matchId} with ${amount} SSS...`);
      // Send SSS with the transaction (no approval needed!)
      const tx = await this.stakeArena.enterMatch(matchIdBytes32, { value: amountWei });
      console.log('Transaction:', tx);
      await tx.wait();
      
      console.log('Successfully entered match');
      return true;
    } catch (error) {
      console.error('Error entering match:', error);
      return false;
    }
  }

  async tapOut(matchId: string): Promise<boolean> {
    if (!this.stakeArena) {
      throw new Error('StakeArena not initialized');
    }

    try {
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      console.log(`Tapping out of match ${matchId}...`);
      const tx = await this.stakeArena.tapOut(matchIdBytes32);
      await tx.wait();
      
      console.log('Successfully tapped out');
      return true;
    } catch (error) {
      console.error('Error tapping out:', error);
      return false;
    }
  }

  async getOnChainLeaderboard(): Promise<Array<{ address: string; score: number }>> {
    if (!this.stakeArena) {
      console.warn('StakeArena not initialized');
      return [];
    }

    try {
      const entries: LeaderboardEntry[] = await this.stakeArena.getLeaderboard();
      return entries.map(entry => ({
        address: entry.player,
        score: Number(entry.score),
      }));
    } catch (error) {
      console.error('Error fetching on-chain leaderboard:', error);
      return [];
    }
  }

  async getBestScore(playerAddress?: string): Promise<number> {
    if (!this.stakeArena) return 0;
    
    const address = playerAddress || this.address;
    if (!address) return 0;

    try {
      const score: bigint = await this.stakeArena.bestScore(address);
      return Number(score);
    } catch (error) {
      console.error('Error fetching best score:', error);
      return 0;
    }
  }

  async getCurrentStake(matchId: string, playerAddress?: string): Promise<string> {
    if (!this.stakeArena) return '0';
    
    const address = playerAddress || this.address;
    if (!address) return '0';

    try {
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const stake: bigint = await this.stakeArena.getStake(matchIdBytes32, address);
      return ethers.formatEther(stake);
    } catch (error) {
      console.error('Error fetching current stake:', error);
      return '0';
    }
  }

  getAddress(): string | null {
    return this.address;
  }

  isConnected(): boolean {
    return this.address !== null;
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

