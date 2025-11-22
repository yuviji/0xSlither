import { ethers } from 'ethers';

// Contract ABIs (minimal, only what we need)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

const STAKE_ARENA_ABI = [
  'function enterMatch(bytes32 matchId, uint256 amount) external',
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
  private gameToken: ethers.Contract | null = null;
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
              chainName: '0xSlither Chainlet',
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
      return this.address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return null;
    }
  }

  initializeContracts(gameTokenAddress: string, stakeArenaAddress: string): void {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    this.gameToken = new ethers.Contract(gameTokenAddress, ERC20_ABI, this.signer);
    this.stakeArena = new ethers.Contract(stakeArenaAddress, STAKE_ARENA_ABI, this.signer);
    
    console.log('Contracts initialized');
    console.log('GameToken:', gameTokenAddress);
    console.log('StakeArena:', stakeArenaAddress);
  }

  async getTokenBalance(): Promise<string> {
    if (!this.gameToken || !this.address) return '0';
    
    try {
      const balance: bigint = await this.gameToken.balanceOf(this.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return '0';
    }
  }

  async approveToken(amount: string): Promise<boolean> {
    if (!this.gameToken || !this.stakeArena) {
      throw new Error('Contracts not initialized');
    }

    try {
      const amountWei = ethers.parseEther(amount);
      const stakeArenaAddress = await this.stakeArena.getAddress();
      
      console.log(`Approving ${amount} tokens...`);
      const tx = await this.gameToken.approve(stakeArenaAddress, amountWei);
      await tx.wait();
      
      console.log('Token approval confirmed');
      return true;
    } catch (error) {
      console.error('Error approving tokens:', error);
      return false;
    }
  }

  async enterMatch(matchId: string, amount: string): Promise<boolean> {
    if (!this.stakeArena) {
      throw new Error('StakeArena not initialized');
    }

    try {
      const amountWei = ethers.parseEther(amount);
      
      console.log(`Entering match ${matchId} with ${amount} tokens...`);
      const tx = await this.stakeArena.enterMatch(matchId, amountWei);
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
      console.log(`Tapping out of match ${matchId}...`);
      const tx = await this.stakeArena.tapOut(matchId);
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
      const stake: bigint = await this.stakeArena.getStake(matchId, address);
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

