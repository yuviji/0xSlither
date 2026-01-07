import {
  Pellet,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PELLET_MIN_SIZE,
  PELLET_MAX_SIZE,
  PELLET_COLORS,
  PELLET_RESPAWN_TIME_MS,
  PELLET_COUNT,
  BASE_PELLET_TOKEN_VALUE,
} from '@0xslither/shared';

interface QueuedRegeneration {
  x: number;
  y: number;
  size: number;
  color: string;
  respawnAt: number; // timestamp when this pellet should respawn
}

export class PelletManager {
  private pellets: Map<string, Pellet> = new Map();
  private nextId = 0;
  private deterministicMode: boolean = false;
  private changedPelletIds: Set<string> = new Set();
  
  // Regeneration system
  private regenerationQueue: QueuedRegeneration[] = [];
  private regenerationPool: number = 0; // ETH available for new pellets
  private maxPellets: number;

  constructor(count: number, initialPellets?: Array<{ x: number; y: number; size: number; color: string }>) {
    this.maxPellets = count;
    
    if (initialPellets && initialPellets.length > 0) {
      // Deterministic mode: use provided pellet positions
      this.deterministicMode = true;
      for (const pellet of initialPellets) {
        this.addPellet(pellet.x, pellet.y, pellet.size, pellet.color);
      }
      console.log(`✅ Pellet field initialized deterministically with ${initialPellets.length} pellets`);
    } else {
      // Fallback mode: use random spawning
      this.deterministicMode = false;
      for (let i = 0; i < count; i++) {
        this.spawnRandomPellet();
      }
      console.log(`⚠️  Pellet field initialized with random positions (${count} pellets)`);
    }
  }

  private addPellet(x: number, y: number, size: number, color: string, tokenAmount: number = 0): string {
    const pellet: Pellet = {
      id: `pellet-${this.nextId++}`,
      x,
      y,
      size,
      color,
      tokenAmount,
    };
    this.pellets.set(pellet.id, pellet);
    return pellet.id;
  }

  private spawnRandomPellet(): void {
    const pellet: Pellet = {
      id: `pellet-${this.nextId++}`,
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      size: PELLET_MIN_SIZE + Math.random() * (PELLET_MAX_SIZE - PELLET_MIN_SIZE),
      color: PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)],
      tokenAmount: 0,
    };
    
    this.pellets.set(pellet.id, pellet);
  }

  /**
   * Remove a pellet and queue it for regeneration
   * @param id Pellet ID to remove
   * @returns The consumed pellet's token amount (for tracking)
   */
  removePellet(id: string): number {
    const pellet = this.pellets.get(id);
    if (!pellet) return 0;
    
    const tokenAmount = pellet.tokenAmount;
    
    // Queue for regeneration at same position
    this.regenerationQueue.push({
      x: pellet.x,
      y: pellet.y,
      size: pellet.size,
      color: pellet.color,
      respawnAt: Date.now() + PELLET_RESPAWN_TIME_MS,
    });
    
    this.pellets.delete(id);
    return tokenAmount;
  }

  /**
   * Add funds to the regeneration pool
   * @param amount ETH amount to add
   */
  addToRegenerationPool(amount: number): void {
    this.regenerationPool += amount;
  }

  /**
   * Get current regeneration pool balance
   */
  getRegenerationPoolBalance(): number {
    return this.regenerationPool;
  }

  /**
   * Process regeneration queue - call this each tick
   * Respawns pellets whose timer has expired if there's funds in the pool
   * @returns Number of pellets regenerated this tick
   */
  processRegeneration(): number {
    const now = Date.now();
    let regenerated = 0;
    
    // Don't exceed max pellet count
    const currentCount = this.pellets.size;
    const availableSlots = this.maxPellets - currentCount;
    
    if (availableSlots <= 0 || this.regenerationQueue.length === 0) {
      return 0;
    }
    
    // Process queue - find pellets ready to respawn
    const stillQueued: QueuedRegeneration[] = [];
    
    for (const queued of this.regenerationQueue) {
      if (regenerated >= availableSlots) {
        // No more slots available, keep in queue
        stillQueued.push(queued);
        continue;
      }
      
      if (now >= queued.respawnAt) {
        // Calculate token amount based on size and available pool
        const sizeRatio = queued.size / PELLET_MAX_SIZE;
        const desiredTokens = BASE_PELLET_TOKEN_VALUE * sizeRatio * 2; // Scale by size
        
        // Only spawn if we have enough in the pool
        if (this.regenerationPool >= desiredTokens) {
          this.regenerationPool -= desiredTokens;
          this.addPellet(queued.x, queued.y, queued.size, queued.color, desiredTokens);
          regenerated++;
        } else if (this.regenerationPool > 0) {
          // Spawn with whatever we have left
          const tokenAmount = this.regenerationPool;
          this.regenerationPool = 0;
          this.addPellet(queued.x, queued.y, queued.size, queued.color, tokenAmount);
          regenerated++;
        } else {
          // No funds, keep in queue
          stillQueued.push(queued);
        }
      } else {
        // Not ready yet, keep in queue
        stillQueued.push(queued);
      }
    }
    
    this.regenerationQueue = stillQueued;
    
    if (regenerated > 0) {
      console.log(`🔄 Regenerated ${regenerated} pellets (pool: ${this.regenerationPool.toFixed(4)} ETH, queued: ${this.regenerationQueue.length})`);
    }
    
    return regenerated;
  }

  /**
   * Get regeneration queue size
   */
  getQueueSize(): number {
    return this.regenerationQueue.length;
  }

  getPellets(): Pellet[] {
    return Array.from(this.pellets.values());
  }

  getPellet(id: string): Pellet | undefined {
    return this.pellets.get(id);
  }

  getChangedPellets(): Pellet[] {
    const changed: Pellet[] = [];
    for (const id of this.changedPelletIds) {
      const pellet = this.pellets.get(id);
      if (pellet) {
        changed.push(pellet);
      }
    }
    return changed;
  }

  clearChanges(): void {
    this.changedPelletIds.clear();
  }

  hasChanges(): boolean {
    return this.changedPelletIds.size > 0;
  }

  /**
   * Initialize pellet tokens from regeneration pool
   * Distributes available pool funds across all pellets proportionally by size
   */
  initializePelletTokens(): void {
    const pellets = Array.from(this.pellets.values());
    
    if (pellets.length === 0 || this.regenerationPool <= 0) {
      console.warn('No pellets or empty pool for initial token distribution');
      return;
    }

    // Calculate total size weight
    const totalSizeWeight = pellets.reduce((sum, p) => sum + p.size, 0);
    const totalToDistribute = this.regenerationPool;

    // Distribute tokens proportionally by size
    let distributedTotal = 0;
    pellets.forEach((pellet, index) => {
      if (index === pellets.length - 1) {
        // Last pellet gets remainder to avoid rounding errors
        pellet.tokenAmount = totalToDistribute - distributedTotal;
      } else {
        pellet.tokenAmount = (pellet.size / totalSizeWeight) * totalToDistribute;
        distributedTotal += pellet.tokenAmount;
      }
    });

    this.regenerationPool = 0; // Pool is now distributed
    console.log(`✅ Distributed ${totalToDistribute.toFixed(4)} ETH tokens across ${pellets.length} pellets`);
  }
}

