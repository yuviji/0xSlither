import { ethers } from 'ethers';

// Event types for batch reporting (must match Solidity enum)
enum EventType {
  EAT = 0,
  DEATH = 1,
}

interface StatEvent {
  eventType: EventType;
  player1: string;
  player2: string;
  score: number;
}

// Contract ABIs (minimal, only what we need)
const STAKE_ARENA_ABI = [
  'function depositToVault() external payable',
  'function reportEat(bytes32 matchId, address eater, address eaten) external',
  'function reportSelfDeath(bytes32 matchId, address player, uint256 score) external',
  'function reportBatchedStats(bytes32 matchId, tuple(uint8 eventType, address player1, address player2, uint256 score)[] events) external',
  'function finalizeMatch(bytes32 matchId, address[] calldata players, uint256[] calldata scores, address winner) external',
  'function withdrawBalance() external',
  'function getLeaderboard() external view returns (tuple(address player, uint256 score)[])',
  'function bestScore(address player) external view returns (uint256)',
  'function getStake(bytes32 matchId, address player) external view returns (uint256)',
  'function isActive(bytes32 matchId, address player) external view returns (bool)',
  'function requestMatchEntropy(bytes32 matchId) external payable',
  'function getMatchSeed(bytes32 matchId) external view returns (bytes32)',
  'function isSeedAvailable(bytes32 matchId) external view returns (bool)',
  'function hasRequestedEntropy(bytes32 matchId) external view returns (bool)',
  'function getEntropyFee() external view returns (uint256)',
  'function registerPlayerJoin(bytes32 matchId, address player) external',
  'event DepositedToVault(address indexed player, uint256 amount, uint256 timestamp)',
  'event EatReported(bytes32 indexed matchId, address indexed eater, address indexed eaten, uint256 timestamp)',
  'event SelfDeathReported(bytes32 indexed matchId, address indexed player, uint256 score, uint256 timestamp)',
  'event EatLoot(bytes32 indexed matchId, address indexed eater, address indexed eaten, uint256 amountTransferred, uint256 timestamp)',
  'event SelfDeath(bytes32 indexed matchId, address indexed player, uint256 amountToServer, uint256 timestamp)',
  'event MatchFinalized(bytes32 indexed matchId, address indexed winner, uint256 timestamp)',
  'event EntropyRequested(bytes32 indexed matchId, uint64 requestId)',
  'event EntropyStored(bytes32 indexed matchId, bytes32 seed)',
  'event BatchStatsReported(bytes32 indexed matchId, uint256 eventCount, uint256 timestamp)',
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
  private explorerUrl: string;
  private pendingTxs: PendingTransaction[] = [];
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds
  
  // Transaction queue per address to prevent race conditions
  // Each address has a promise chain that ensures operations are serialized
  private addressQueues: Map<string, Promise<void>> = new Map();

  // Batch reporting for stats (non-critical events)
  private statBatchBuffer: StatEvent[] = [];
  private lastBatchFlush: number = Date.now();
  private readonly BATCH_INTERVAL_MS = 15000; // 15 seconds
  private readonly BATCH_SIZE_THRESHOLD = 50; // Flush when buffer reaches this size
  private matchId: string = ''; // Set by server

  constructor(
    rpcUrl: string,
    privateKey: string,
    stakeArenaAddress: string,
    explorerUrl: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.stakeArena = new ethers.Contract(
      stakeArenaAddress,
      STAKE_ARENA_ABI,
      this.wallet
    );
    this.explorerUrl = explorerUrl;

    console.log('BlockchainService initialized');
    console.log('Server wallet:', this.wallet.address);
    console.log('StakeArena contract:', stakeArenaAddress);
    console.log('Using native ETH for game economy');
    
    // Start periodic batch flush timer
    this.startBatchFlushTimer();
  }

  /**
   * Set the current match ID for batch reporting
   */
  setMatchId(matchId: string): void {
    this.matchId = matchId;
  }

  /**
   * Start periodic batch flush timer
   */
  private startBatchFlushTimer(): void {
    setInterval(() => {
      if (this.statBatchBuffer.length > 0) {
        const timeSinceFlush = Date.now() - this.lastBatchFlush;
        if (timeSinceFlush >= this.BATCH_INTERVAL_MS) {
          this.flushStatBatch();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Generate a match ID from a unique string
   */
  generateMatchId(uniqueString: string): string {
    return ethers.id(uniqueString);
  }

  /**
   * Verify that a player has deposited to the vault recently
   * Checks DepositedToVault events from the contract
   * @param playerAddress Player's address
   * @param minAmount Minimum deposit amount required (in ETH)
   * @param blocksBack How many blocks back to check (default: 1000)
   * @returns True if player has deposited at least minAmount
   */
  async verifyVaultDeposit(
    playerAddress: string,
    minAmount: string = '1',
    blocksBack: number = 1000
  ): Promise<boolean> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - blocksBack);
      
      // Query DepositedToVault events for this player
      const filter = this.stakeArena.filters.DepositedToVault(playerAddress);
      const events = await this.stakeArena.queryFilter(filter, fromBlock, currentBlock);
      
      if (events.length === 0) {
        console.log(`[Blockchain] No deposits found for ${playerAddress.slice(0, 8)} in last ${blocksBack} blocks`);
        return false;
      }
      
      // Check if any deposit meets the minimum amount
      const minAmountWei = ethers.parseEther(minAmount);
      for (const event of events) {
        // Type guard: Check if event is EventLog (has args property)
        if ('args' in event && event.args) {
          const depositAmount = event.args.amount || 0n;
          if (depositAmount >= minAmountWei) {
            console.log(`[Blockchain] ✅ Verified deposit: ${ethers.formatEther(depositAmount)} ETH from ${playerAddress.slice(0, 8)}`);
            return true;
          }
        }
      }
      
      console.log(`[Blockchain] Deposits found but below minimum ${minAmount} ETH for ${playerAddress.slice(0, 8)}`);
      return false;
    } catch (error) {
      console.error('[Blockchain] Error verifying vault deposit:', error);
      return false;
    }
  }

  /**
   * Transfer kill reward directly from server wallet to killer
   * This is used in vault mode where stakes are held in server wallet
   * @param killerAddress Address of the player who got the kill
   * @param amount Amount to transfer (victim's stake, in ETH)
   */
  async transferKillReward(
    killerAddress: string,
    amount: number
  ): Promise<void> {
    const description = `transferKillReward: ${amount.toFixed(2)} ETH to ${killerAddress.slice(0, 8)}`;
    
    // Queue this operation for the killer's address
    const operation = async () => {
      await this.executeWithRetry(async () => {
        console.log(`[Blockchain] ${description}`);
        
        // Convert amount to wei (18 decimals for native ETH)
        const amountWei = ethers.parseEther(amount.toFixed(18));
        
        // Check server wallet balance
        const serverBalance = await this.provider.getBalance(this.wallet.address);
        if (serverBalance < amountWei) {
          console.error(`[Blockchain] Insufficient server balance for kill reward: ${ethers.formatEther(serverBalance)} < ${amount.toFixed(2)} ETH`);
          throw new Error('Insufficient server balance for kill reward');
        }
        
        // Transfer native ETH from server to killer
        const tx = await this.wallet.sendTransaction({
          to: killerAddress,
          value: amountWei,
        });
        const receipt = await tx.wait();
        console.log(`[Blockchain] ✅ Kill reward sent: ${amount.toFixed(2)} ETH to ${killerAddress.slice(0, 8)}, tx: ${receipt!.hash}`);
        return receipt;
      }, description);
    };
    
    // Queue for the killer's address
    this.queueForAddress(killerAddress, operation);
  }

  /**
   * Report that one player ate another (batched for efficiency)
   * In vault mode, stake transfers happen via transferKillReward()
   * This is for stats/leaderboard only
   */
  async reportEat(
    matchId: string,
    eaterAddress: string,
    eatenAddress: string
  ): Promise<void> {
    // Add to batch buffer instead of immediate transaction
    this.statBatchBuffer.push({
      eventType: EventType.EAT,
      player1: eaterAddress,
      player2: eatenAddress,
      score: 0,
    });
    
    // Flush if buffer is full
    if (this.statBatchBuffer.length >= this.BATCH_SIZE_THRESHOLD) {
      await this.flushStatBatch();
    }
  }

  /**
   * Report that a player died from self-inflicted causes (batched for efficiency)
   * (wall collision, eating self, disconnect, etc.)
   * This is for leaderboard updates only
   */
  async reportSelfDeath(
    matchId: string,
    playerAddress: string,
    score: number
  ): Promise<void> {
    // Add to batch buffer instead of immediate transaction
    this.statBatchBuffer.push({
      eventType: EventType.DEATH,
      player1: playerAddress,
      player2: ethers.ZeroAddress,
      score: score,
    });
    
    // Flush if buffer is full
    if (this.statBatchBuffer.length >= this.BATCH_SIZE_THRESHOLD) {
      await this.flushStatBatch();
    }
  }

  /**
   * Flush batched stat events to blockchain
   */
  private async flushStatBatch(): Promise<void> {
    if (this.statBatchBuffer.length === 0) return;

    const batch = [...this.statBatchBuffer];
    this.statBatchBuffer = [];
    this.lastBatchFlush = Date.now();

    const description = `flushStatBatch: ${batch.length} events`;
    
    const txPromise = this.executeWithRetry(async () => {
      console.log(`[Blockchain] Flushing ${batch.length} stat events`);
      
      const matchIdBytes32 = ethers.id(this.matchId);
      const tx = await this.stakeArena.reportBatchedStats(matchIdBytes32, batch);
      const receipt = await tx.wait();
      console.log(`[Blockchain] ✅ Batch flushed: ${receipt!.hash} (${batch.length} events)`);
      return receipt;
    }, description);

    this.pendingTxs.push({ promise: txPromise, description });
    this.cleanupPendingTxs();
  }

  /**
   * Force flush any pending batched stats (call before shutdown)
   */
  async forceFlushBatch(): Promise<void> {
    if (this.statBatchBuffer.length > 0) {
      console.log(`[Blockchain] Force flushing ${this.statBatchBuffer.length} pending stat events`);
      await this.flushStatBatch();
    }
  }

  /**
   * Request entropy for a match from Pyth (via StakeArena)
   * @param matchId Match identifier string
   * @returns Request ID (sequence number) or null if failed
   */
  async requestMatchEntropy(matchId: string): Promise<string | null> {
    try {
      const matchIdBytes32 = ethers.id(matchId);
      console.log(`[Blockchain] Requesting entropy for match ${matchId}`);
      console.log(`[Blockchain] Match ID (bytes32): ${matchIdBytes32}`);

      // Check if already requested
      const alreadyRequested = await this.stakeArena.hasRequestedEntropy(matchIdBytes32);
      if (alreadyRequested) {
        console.log(`[Blockchain] Entropy already requested for match ${matchId}`);
        // Could retrieve the request ID if needed, but we don't store it separately
        return 'already-requested';
      }

      // Get entropy fee
      const fee = await this.stakeArena.getEntropyFee();
      console.log(`[Blockchain] Entropy fee: ${ethers.formatEther(fee)} ETH`);

      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      if (balance < fee) {
        console.error(`[Blockchain] Insufficient balance: ${ethers.formatEther(balance)} ETH, need ${ethers.formatEther(fee)} ETH`);
        return null;
      }

      // Request entropy
      console.log('[Blockchain] Sending requestMatchEntropy transaction...');
      const tx = await this.stakeArena.requestMatchEntropy(matchIdBytes32, { value: fee });
      console.log(`[Blockchain] Transaction sent: ${tx.hash}`);
      console.log(`[Blockchain] View on Explorer: ${this.explorerUrl}/tx/${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`[Blockchain] Transaction confirmed in block ${receipt!.blockNumber}`);

      // Parse EntropyRequested event
      const entropyRequestedEvent = receipt!.logs
        .map((log: any) => {
          try {
            return this.stakeArena.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'EntropyRequested');

      if (entropyRequestedEvent) {
        const requestId = entropyRequestedEvent.args.requestId.toString();
        console.log(`[Blockchain] ✅ Entropy requested! Request ID: ${requestId}`);
        return requestId;
      } else {
        console.error('[Blockchain] EntropyRequested event not found in receipt');
        return null;
      }
    } catch (error) {
      console.error('[Blockchain] Error requesting entropy:', error);
      return null;
    }
  }

  /**
   * Check if seed is available for a match
   * @param matchId Match identifier string
   */
  async isSeedAvailable(matchId: string): Promise<boolean> {
    try {
      const matchIdBytes32 = ethers.id(matchId);
      return await this.stakeArena.isSeedAvailable(matchIdBytes32);
    } catch (error) {
      console.error('[Blockchain] Error checking seed availability:', error);
      return false;
    }
  }

  /**
   * Get the revealed seed for a match
   * @param matchId Match identifier string
   * @returns Seed (bytes32 string) or null if not available
   */
  async getMatchSeed(matchId: string): Promise<string | null> {
    try {
      const matchIdBytes32 = ethers.id(matchId);
      const seed = await this.stakeArena.getMatchSeed(matchIdBytes32);
      
      if (seed === ethers.ZeroHash) {
        return null;
      }
      
      console.log(`[Blockchain] ✅ Retrieved seed for match ${matchId}: ${seed}`);
      return seed;
    } catch (error) {
      console.error('[Blockchain] Error getting match seed:', error);
      return null;
    }
  }

  /**
   * Wait for match seed to be available (with timeout)
   * Polls until seed is revealed by Pyth
   * @param matchId Match identifier string
   * @param maxWaitMs Maximum time to wait in milliseconds (default 60s)
   * @param pollIntervalMs Polling interval in milliseconds (default 3s)
   * @returns Seed or null if timeout
   */
  async waitForSeed(
    matchId: string,
    maxWaitMs: number = 60000,
    pollIntervalMs: number = 3000
  ): Promise<string | null> {
    console.log(`[Blockchain] Waiting for seed for match ${matchId}...`);
    console.log(`[Blockchain] Max wait: ${maxWaitMs / 1000}s, poll interval: ${pollIntervalMs / 1000}s`);
    
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < maxWaitMs) {
      attempt++;
      
      // Check if seed is available
      const available = await this.isSeedAvailable(matchId);
      
      if (available) {
        const seed = await this.getMatchSeed(matchId);
        if (seed) {
          console.log(`[Blockchain] ✅ Seed available after ${(Date.now() - startTime) / 1000}s (${attempt} attempts)`);
          return seed;
        }
      }

      // Calculate dynamic poll interval with exponential backoff
      const currentPollInterval = Math.min(pollIntervalMs * Math.pow(1.2, Math.floor(attempt / 3)), 10000);
      
      console.log(`[Blockchain] Seed not yet available (attempt ${attempt}, waited ${Math.floor((Date.now() - startTime) / 1000)}s)...`);
      
      // Sleep before next poll
      await this.sleep(currentPollInterval);
    }

    console.error(`[Blockchain] ⏱️  Timeout waiting for seed after ${maxWaitMs / 1000}s`);
    return null;
  }

  /**
   * Register a player joining the match (for spawn verification)
   * @param matchId Match identifier
   * @param playerAddress Player's address
   */
  async registerPlayerJoin(matchId: string, playerAddress: string): Promise<void> {
    const description = `registerPlayerJoin: ${playerAddress.slice(0, 8)} in match ${matchId.slice(0, 10)}`;
    
    const txPromise = this.executeWithRetry(async () => {
      console.log(`[Blockchain] ${description}`);
      const matchIdBytes32 = ethers.id(matchId);
      const tx = await this.stakeArena.registerPlayerJoin(matchIdBytes32, playerAddress);
      const receipt = await tx.wait();
      console.log(`[Blockchain] ✅ Player join registered: ${receipt!.hash}`);
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
      console.log(`[Blockchain] finalizeMatch confirmed: ${receipt!.hash}`);
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
      return Math.floor(Number(ethers.formatEther(stake)));
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
   * Queue an operation for a specific address to prevent race conditions
   * Operations for the same address are serialized (executed one after another)
   */
  private queueForAddress(address: string, operation: () => Promise<void>): void {
    // Get the current queue for this address (or create an empty resolved promise)
    const currentQueue = this.addressQueues.get(address) || Promise.resolve();
    
    // Chain the new operation to the existing queue
    const newQueue = currentQueue
      .then(() => operation())
      .catch((error) => {
        console.error(`[Blockchain] Queued operation failed for ${address.slice(0, 8)}:`, error);
      });
    
    // Update the queue for this address
    this.addressQueues.set(address, newQueue);
    
    // Clean up the queue entry after operation completes
    newQueue.finally(() => {
      // If this is still the active queue, remove it
      if (this.addressQueues.get(address) === newQueue) {
        this.addressQueues.delete(address);
      }
    });
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
      } catch (error: any) {
        // Enhanced error logging
        console.error(
          `[Blockchain] ${description} failed (attempt ${attempt}/${this.maxRetries}):`
        );
        
        if (error.code) {
          console.error(`  Error code: ${error.code}`);
        }
        if (error.reason) {
          console.error(`  Reason: ${error.reason}`);
        }
        if (error.data) {
          console.error(`  Data: ${error.data}`);
        }
        console.error(`  Message: ${error.message || error}`);
        
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
   * Withdraw accumulated native ETH from StakeArena contract to server wallet
   * This retrieves funds from self-deaths and other contract accumulations
   */
  async withdrawContractBalance(): Promise<boolean> {
    try {
      // Get the StakeArena contract address
      const contractAddress = await this.stakeArena.getAddress();
      
      // Check the contract's native ETH balance
      const balance = await this.provider.getBalance(contractAddress);
      const balanceFormatted = ethers.formatEther(balance);
      
      console.log(`[Blockchain] StakeArena contract balance: ${balanceFormatted} ETH`);
      
      // Only withdraw if balance is above a threshold (e.g., 0.01 ETH)
      const threshold = ethers.parseEther("0.01");
      
      if (balance < threshold) {
        console.log(`[Blockchain] Balance below threshold (${ethers.formatEther(threshold)} ETH), skipping withdrawal`);
        return false;
      }
      
      console.log(`[Blockchain] Withdrawing ${balanceFormatted} ETH from contract to server wallet...`);
      
      // Call withdrawBalance function
      const tx = await this.stakeArena.withdrawBalance();
      const receipt = await tx.wait();
      
      console.log(`[Blockchain] ✅ Successfully withdrew ${balanceFormatted} ETH`);
      console.log(`[Blockchain] Transaction: ${receipt?.hash}`);
      
      // Check new server wallet balance
      const serverBalance = await this.provider.getBalance(this.wallet.address);
      console.log(`[Blockchain] Server wallet balance: ${ethers.formatEther(serverBalance)} ETH`);
      
      return true;
    } catch (error) {
      console.error('[Blockchain] Error withdrawing contract balance:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Get the StakeArena contract's native ETH balance
   */
  async getContractBalance(): Promise<string> {
    try {
      const contractAddress = await this.stakeArena.getAddress();
      const balance = await this.provider.getBalance(contractAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('[Blockchain] Error getting contract balance:', error);
      return "0";
    }
  }

  /**
   * Get the server wallet's native ETH balance
   */
  async getServerWalletBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('[Blockchain] Error getting server wallet balance:', error);
      return "0";
    }
  }

  /**
   * Settle pellet tokens at match end/tap-out
   * Server pays out accumulated pellet tokens to player via native ETH transfer
   * @param playerAddress Player's address
   * @param pelletTokens Amount of pellet tokens the player accumulated
   */
  async settlePelletTokens(
    playerAddress: string,
    pelletTokens: number
  ): Promise<void> {
    const description = `settlePelletTokens: ${pelletTokens.toFixed(2)} ETH to ${playerAddress.slice(0, 8)}`;
    
    // If player has no pellet tokens, nothing to settle
    if (pelletTokens <= 0) {
      console.log(`[Blockchain] No pellet tokens to settle for ${playerAddress.slice(0, 8)}`);
      return;
    }

    // Queue this operation for the player's address
    const operation = async () => {
      await this.executeWithRetry(async () => {
        console.log(`[Blockchain] ${description}`);
        
        // Convert pellet tokens to wei (18 decimals for native ETH)
        const amountWei = ethers.parseEther(pelletTokens.toFixed(18));
        
        // Check server wallet balance (native token balance)
        const serverBalance = await this.provider.getBalance(this.wallet.address);
        if (serverBalance < amountWei) {
          console.error(`[Blockchain] Insufficient server balance for pellet token payout: ${ethers.formatEther(serverBalance)} < ${pelletTokens.toFixed(2)} ETH`);
          throw new Error('Insufficient server balance for pellet token payout');
        }
        
        // Transfer native ETH from server to player
        const tx = await this.wallet.sendTransaction({
          to: playerAddress,
          value: amountWei,
        });
        const receipt = await tx.wait();
        console.log(`[Blockchain] ✅ Pellet tokens settled: ${pelletTokens.toFixed(2)} ETH to ${playerAddress.slice(0, 8)}, tx: ${receipt!.hash}`);
        return receipt;
      }, description);
    };
    
    // Queue for the player's address to prevent race conditions
    this.queueForAddress(playerAddress, operation);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
