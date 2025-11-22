import { ethers } from 'ethers';

// Contract ABIs (minimal, only what we need)
const STAKE_ARENA_ABI = [
  'function reportEat(bytes32 matchId, address eater, address eaten) external',
  'function reportSelfDeath(bytes32 matchId, address player) external',
  'function commitEntropy(bytes32 matchId, bytes32 entropyRequestId) external',
  'function finalizeMatch(bytes32 matchId, address[] calldata players, uint256[] calldata scores, address winner) external',
  'function getLeaderboard() external view returns (tuple(address player, uint256 score)[])',
  'function bestScore(address player) external view returns (uint256)',
  'function getStake(bytes32 matchId, address player) external view returns (uint256)',
  'function isActive(bytes32 matchId, address player) external view returns (bool)',
  'event EatLoot(bytes32 indexed matchId, address indexed eater, address indexed eaten, uint256 amountTransferred, uint256 timestamp)',
  'event SelfDeath(bytes32 indexed matchId, address indexed player, uint256 amountToServer, uint256 timestamp)',
  'event MatchFinalized(bytes32 indexed matchId, address indexed winner, uint256 timestamp)',
];

interface LeaderboardEntry {
  player: string;
  score: bigint;
}

interface PendingTransaction {
  promise: Promise<ethers.TransactionReceipt | null>;
  description: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private stakeArena: ethers.Contract;
  private pendingTxs: PendingTransaction[] = [];
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds

  constructor(
    rpcUrl: string,
    privateKey: string,
    stakeArenaAddress: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.stakeArena = new ethers.Contract(
      stakeArenaAddress,
      STAKE_ARENA_ABI,
      this.wallet
    );

    console.log('BlockchainService initialized');
    console.log('Server wallet:', this.wallet.address);
    console.log('StakeArena contract:', stakeArenaAddress);
    console.log('Using native SSS token for game economy');
  }

  /**
   * Generate a match ID from a unique string
   */
  generateMatchId(uniqueString: string): string {
    return ethers.id(uniqueString);
  }

  /**
   * Report that one player ate another
   * Non-blocking, fire-and-forget with retry logic
   */
  async reportEat(
    matchId: string,
    eaterAddress: string,
    eatenAddress: string
  ): Promise<void> {
    const description = `reportEat: ${eaterAddress.slice(0, 8)} ate ${eatenAddress.slice(0, 8)} in match ${matchId.slice(0, 10)}`;
    
    const txPromise = this.executeWithRetry(async () => {
      console.log(`[Blockchain] ${description}`);
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const tx = await this.stakeArena.reportEat(
        matchIdBytes32,
        eaterAddress,
        eatenAddress
      );
      const receipt = await tx.wait();
      console.log(`[Blockchain] reportEat confirmed: ${receipt.hash}`);
      return receipt;
    }, description);

    this.pendingTxs.push({ promise: txPromise, description });
    this.cleanupPendingTxs();
  }

  /**
   * Report that a player died from self-inflicted causes
   * (wall collision, eating self, etc.) - stake goes to server
   * Non-blocking, fire-and-forget with retry logic
   */
  async reportSelfDeath(
    matchId: string,
    playerAddress: string
  ): Promise<void> {
    const description = `reportSelfDeath: ${playerAddress.slice(0, 8)} died in match ${matchId.slice(0, 10)}`;
    
    const txPromise = this.executeWithRetry(async () => {
      console.log(`[Blockchain] ${description}`);
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const tx = await this.stakeArena.reportSelfDeath(
        matchIdBytes32,
        playerAddress
      );
      const receipt = await tx.wait();
      console.log(`[Blockchain] reportSelfDeath confirmed: ${receipt.hash}`);
      return receipt;
    }, description);

    this.pendingTxs.push({ promise: txPromise, description });
    this.cleanupPendingTxs();
  }

  /**
   * Commit entropy seed for a match
   * Non-blocking with retry logic
   */
  async commitEntropy(matchId: string, entropyRequestId: string): Promise<void> {
    const description = `commitEntropy for match ${matchId.slice(0, 10)}`;
    
    const txPromise = this.executeWithRetry(async () => {
      console.log(`[Blockchain] ${description}`);
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const entropyBytes32 = ethers.id(entropyRequestId);
      const tx = await this.stakeArena.commitEntropy(matchIdBytes32, entropyBytes32);
      const receipt = await tx.wait();
      console.log(`[Blockchain] commitEntropy confirmed: ${receipt.hash}`);
      return receipt;
    }, description);

    this.pendingTxs.push({ promise: txPromise, description });
    this.cleanupPendingTxs();
  }

  /**
   * Finalize a match and update leaderboard
   * Non-blocking with retry logic
   */
  async finalizeMatch(
    matchId: string,
    players: string[],
    scores: number[],
    winner: string
  ): Promise<void> {
    const description = `finalizeMatch ${matchId.slice(0, 10)} with ${players.length} players`;
    
    const txPromise = this.executeWithRetry(async () => {
      console.log(`[Blockchain] ${description}`);
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const tx = await this.stakeArena.finalizeMatch(
        matchIdBytes32,
        players,
        scores,
        winner
      );
      const receipt = await tx.wait();
      console.log(`[Blockchain] finalizeMatch confirmed: ${receipt.hash}`);
      return receipt;
    }, description);

    this.pendingTxs.push({ promise: txPromise, description });
    this.cleanupPendingTxs();
  }

  /**
   * Get on-chain leaderboard
   */
  async getLeaderboard(): Promise<Array<{ address: string; score: number }>> {
    try {
      const entries: LeaderboardEntry[] = await this.stakeArena.getLeaderboard();
      return entries.map(entry => ({
        address: entry.player,
        score: Number(entry.score),
      }));
    } catch (error) {
      console.error('[Blockchain] Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Get best score for a player
   */
  async getBestScore(playerAddress: string): Promise<number> {
    try {
      const score: bigint = await this.stakeArena.bestScore(playerAddress);
      return Number(score);
    } catch (error) {
      console.error('[Blockchain] Error fetching best score:', error);
      return 0;
    }
  }

  /**
   * Get player's stake in a match
   */
  async getStake(matchId: string, playerAddress: string): Promise<number> {
    try {
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      const stake: bigint = await this.stakeArena.getStake(matchIdBytes32, playerAddress);
      return Number(ethers.formatEther(stake));
    } catch (error) {
      console.error('[Blockchain] Error fetching stake:', error);
      return 0;
    }
  }

  /**
   * Check if player is active in a match
   */
  async isActive(matchId: string, playerAddress: string): Promise<boolean> {
    try {
      // Convert string match ID to bytes32
      const matchIdBytes32 = ethers.id(matchId);
      return await this.stakeArena.isActive(matchIdBytes32, playerAddress);
    } catch (error) {
      console.error('[Blockchain] Error checking active status:', error);
      return false;
    }
  }

  /**
   * Execute a transaction with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    description: string
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        console.error(
          `[Blockchain] ${description} failed (attempt ${attempt}/${this.maxRetries}):`,
          error instanceof Error ? error.message : error
        );
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }
    
    console.error(`[Blockchain] ${description} failed after ${this.maxRetries} attempts`);
    return null;
  }

  /**
   * Clean up completed pending transactions
   */
  private cleanupPendingTxs(): void {
    this.pendingTxs = this.pendingTxs.filter(tx => {
      // Check if promise is settled
      let settled = false;
      tx.promise.then(() => { settled = true; }).catch(() => { settled = true; });
      return !settled;
    });
  }

  /**
   * Wait for all pending transactions to complete
   */
  async waitForPendingTransactions(): Promise<void> {
    console.log(`[Blockchain] Waiting for ${this.pendingTxs.length} pending transactions...`);
    await Promise.allSettled(this.pendingTxs.map(tx => tx.promise));
    this.pendingTxs = [];
  }

  /**
   * Get number of pending transactions
   */
  getPendingTxCount(): number {
    return this.pendingTxs.length;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

