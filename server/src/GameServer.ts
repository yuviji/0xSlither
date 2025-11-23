import { SnakeEntity } from './Snake';
import { PelletManager } from './Pellet';
import { CollisionDetection } from './CollisionDetection';
import { Leaderboard } from './Leaderboard';
import { BlockchainService } from './BlockchainService';
import { EntropyBridgeService } from './EntropyBridgeService';
import { DeterministicRNG } from './DeterministicRNG';
import {
  StateMessage,
  MessageType,
  SerializedSnake,
  SerializedPellet,
  TICK_INTERVAL,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PELLET_COUNT,
} from '@0xslither/shared';

export class GameServer {
  private snakes: Map<string, SnakeEntity> = new Map();
  private pelletManager: PelletManager;
  private tickCount = 0;
  private lastTickTime = Date.now();
  private gameLoop: NodeJS.Timeout | null = null;
  private blockchain: BlockchainService | null = null;
  private matchId: string | null = null;
  private entropyBridge: EntropyBridgeService | null = null;
  private matchRNG: DeterministicRNG | null = null;
  private entropyRequestId: string | null = null;
  private entropyPending: boolean = false;
  private devFallbackMode: boolean = false;
  private entropySeed: string | null = null;

  constructor() {
    // Pellet manager will be initialized after entropy is available
    this.pelletManager = new PelletManager(PELLET_COUNT);
  }

  setBlockchainService(blockchain: BlockchainService, matchId: string): void {
    this.blockchain = blockchain;
    this.matchId = matchId;
    
    // Initialize entropy bridge service
    this.entropyBridge = new EntropyBridgeService();
    
    // Request entropy for this match in the background
    this.initializeMatchEntropy();
  }

  /**
   * Initialize match entropy (non-blocking)
   * Requests randomness from Base Sepolia and initializes RNG when available
   */
  private async initializeMatchEntropy(): Promise<void> {
    if (!this.entropyBridge || !this.entropyBridge.isEnabled() || !this.matchId) {
      console.warn('⚠️  Entropy bridge not available, using fallback RNG');
      this.devFallbackMode = true;
      return;
    }

    console.log('🎲 Initializing match entropy...');
    this.entropyPending = true;

    try {
      // Request entropy and wait for reveal (non-blocking, runs in background)
      const seed = await this.entropyBridge.requestAndWaitForSeed(this.matchId, 60000);
      
      if (seed) {
        console.log('✅ Entropy seed received:', seed);
        
        // Store the seed for display
        this.entropySeed = seed;
        
        // Initialize deterministic RNG
        this.matchRNG = new DeterministicRNG(seed);
        console.log('✅ Deterministic RNG initialized');
        
        // Reinitialize pellet field with deterministic positions
        const deterministicPellets = this.matchRNG.getPelletPositions(PELLET_COUNT);
        this.pelletManager = new PelletManager(PELLET_COUNT, deterministicPellets);
        
        // Get map type for logging
        const mapType = this.matchRNG.getMapType();
        console.log(`🗺️  Map type: ${mapType}`);
        
        // Commit seed hash to Saga
        if (this.blockchain && this.entropyRequestId) {
          await this.blockchain.commitEntropyToSaga(this.matchId, this.entropyRequestId, seed);
          console.log('✅ Seed hash committed to Saga');
        }
        
        this.entropyPending = false;
        this.devFallbackMode = false;
        console.log('🎮 Match ready with fair RNG!');
      } else {
        console.error('⏱️  Entropy timeout - falling back to non-cryptographic RNG');
        this.devFallbackMode = true;
        this.entropyPending = false;
      }
    } catch (error) {
      console.error('❌ Error initializing match entropy:', error);
      this.devFallbackMode = true;
      this.entropyPending = false;
    }
  }

  start(): void {
    console.log('Game server started');
    this.gameLoop = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  stop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  private tick(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastTickTime) / 1000; // Convert to seconds
    this.lastTickTime = now;
    this.tickCount++;

    // Update all snakes
    for (const snake of this.snakes.values()) {
      if (snake.alive) {
        snake.update(deltaTime);
      }
    }

    // Check pellet collisions
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;

      for (const pellet of this.pelletManager.getPellets()) {
        if (CollisionDetection.checkPelletCollision(snake, pellet)) {
          // Growth is proportional to pellet size
          // Min size (4) gives 2 segments, max size (8) gives 4 segments
          const growthAmount = Math.round(pellet.size / 2);
          snake.grow(growthAmount);
          this.pelletManager.removePellet(pellet.id);
        }
      }
    }

    // Check snake collisions
    const aliveSnakes = Array.from(this.snakes.values()).filter(s => s.alive);
    const collisions = CollisionDetection.checkSnakeCollisions(aliveSnakes);
    
    for (const collision of collisions) {
      const victim = this.snakes.get(collision.victimId);
      if (victim && victim.alive) {
        const victimScore = victim.getScore();
        victim.kill();
        
        // If killed by another snake (not self-collision), transfer points
        if (collision.killerId && collision.killerId !== collision.victimId) {
          const killer = this.snakes.get(collision.killerId);
          if (killer && killer.alive) {
            // Killer gains the victim's score
            killer.grow(victimScore);
            console.log(`${killer.name} ate ${victim.name} and gained ${victimScore} points!`);
            
            // Report to blockchain if both have addresses
            if (this.blockchain && this.matchId && killer.address && victim.address) {
              this.blockchain.reportEat(this.matchId, killer.address, victim.address)
                .catch(err => console.error('Error reporting eat to blockchain:', err));
            }
          }
        } else {
          // Self-collision or no killer - report self death to blockchain
          console.log(`${victim.name} died from self-collision with score ${victimScore}`);
          if (this.blockchain && this.matchId && victim.address) {
            // Check if player is active before reporting self death
            this.blockchain.isActive(this.matchId, victim.address)
              .then(isActive => {
                if (isActive && this.blockchain) {
                  console.log(`Reporting self-collision death for ${victim.address} to blockchain`);
                  return this.blockchain.reportSelfDeath(this.matchId as string, victim.address as string, victimScore);
                } else {
                  console.log(`Player ${victim.address} not active in match, skipping self-death report`);
                }
              })
              .catch(err => console.error('Error checking active status or reporting self death:', err));
          }
        }
      }
    }

    // Check world bounds
    for (const snake of this.snakes.values()) {
      if (snake.alive && CollisionDetection.checkWorldBounds(snake, WORLD_WIDTH, WORLD_HEIGHT)) {
        const snakeScore = snake.getScore();
        console.log(`${snake.name} died from wall collision with score ${snakeScore}`);
        snake.kill();
        
        // Report wall collision death to blockchain
        if (this.blockchain && this.matchId && snake.address) {
          // Check if player is active before reporting self death
          this.blockchain.isActive(this.matchId, snake.address)
            .then(isActive => {
              if (isActive && this.blockchain && snake.address) {
                console.log(`Reporting wall collision death for ${snake.address} to blockchain`);
                return this.blockchain.reportSelfDeath(this.matchId as string, snake.address as string, snakeScore);
              } else {
                console.log(`Player ${snake.address} not active in match, skipping wall-death report`);
              }
            })
            .catch(err => console.error('Error checking active status or reporting wall death:', err));
        }
      }
    }
  }

  addSnake(id: string, name: string, address?: string): SnakeEntity {
    let x: number, y: number, color: string;
    
    if (this.matchRNG && address) {
      // Deterministic mode: use entropy-derived spawn and color
      const existingPositions = Array.from(this.snakes.values())
        .filter(s => s.alive)
        .map(s => ({ x: s.headPosition.x, y: s.headPosition.y }));
      
      const position = this.matchRNG.getSpawnPositionWithRetry(address, existingPositions, 10);
      x = position.x;
      y = position.y;
      color = this.matchRNG.getSnakeColor(address);
      
      console.log(`✅ Deterministic spawn for ${address.slice(0, 8)}... at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    } else {
      // Fallback mode: random spawn
      const margin = 500;
      x = margin + Math.random() * (WORLD_WIDTH - 2 * margin);
      y = margin + Math.random() * (WORLD_HEIGHT - 2 * margin);
      
      // Generate color based on player ID or address
      const seedString = address || id;
      const hue = parseInt(seedString.slice(-6), 36) % 360;
      color = `hsl(${hue}, 70%, 60%)`;
      
      if (this.devFallbackMode) {
        console.warn(`⚠️  Fallback spawn for ${name} at (${x.toFixed(0)}, ${y.toFixed(0)}) - not deterministic`);
      }
    }
    
    const snake = new SnakeEntity(id, name, x, y, color, address);
    this.snakes.set(id, snake);
    
    const addressLog = address ? ` wallet: ${address}` : '';
    console.log(`Snake ${name} (${id})${addressLog} spawned at (${x.toFixed(0)}, ${y.toFixed(0)}) color: ${color}`);
    
    return snake;
  }

  removeSnake(id: string): void {
    this.snakes.delete(id);
    console.log(`Snake ${id} removed`);
  }

  removeSnakeByAddress(address: string): void {
    for (const [id, snake] of this.snakes.entries()) {
      if (snake.address === address) {
        this.snakes.delete(id);
        console.log(`Snake ${id} with address ${address} removed (duplicate login cleanup)`);
        return;
      }
    }
  }

  getSnake(id: string): SnakeEntity | undefined {
    return this.snakes.get(id);
  }

  setSnakeTargetAngle(id: string, angle: number): void {
    const snake = this.snakes.get(id);
    if (snake && snake.alive) {
      snake.setTargetAngle(angle);
    }
  }

  getGameState(): StateMessage {
    const snakes: SerializedSnake[] = Array.from(this.snakes.values())
      .filter(snake => snake.alive)
      .map(snake => ({
        id: snake.id,
        name: snake.name,
        address: snake.address,
        head: [snake.headPosition.x, snake.headPosition.y] as [number, number],
        angle: snake.angle,
        segments: snake.segments.map(seg => [seg.x, seg.y] as [number, number]),
        color: snake.color,
      }));

    const pellets: SerializedPellet[] = this.pelletManager
      .getPellets()
      .map(pellet => [pellet.x, pellet.y, pellet.size, pellet.color] as SerializedPellet);

    const leaderboard = Leaderboard.compute(Array.from(this.snakes.values()));

    return {
      type: MessageType.STATE,
      tick: this.tickCount,
      snakes,
      pellets,
      leaderboard: leaderboard.map(entry => [entry.name, entry.score, entry.address] as [string, number, string?]),
      matchId: this.matchId || undefined,
      entropyPending: this.entropyPending,
      entropyRequestId: this.entropyRequestId || undefined,
      useFairRNG: !this.devFallbackMode,
      mapType: this.matchRNG?.getMapType(),
      entropySeed: this.entropySeed || undefined,
    };
  }

  /**
   * Get match entropy info for debugging/display
   */
  getEntropyInfo(): {
    requestId: string | null;
    hasSeed: boolean;
    pending: boolean;
    fallbackMode: boolean;
    mapType?: string;
  } {
    return {
      requestId: this.entropyRequestId,
      hasSeed: this.matchRNG !== null,
      pending: this.entropyPending,
      fallbackMode: this.devFallbackMode,
      mapType: this.matchRNG?.getMapType(),
    };
  }

  isSnakeDead(id: string): boolean {
    const snake = this.snakes.get(id);
    return snake ? !snake.alive : true;
  }

  getSnakeScore(id: string): number {
    const snake = this.snakes.get(id);
    return snake ? snake.getScore() : 0;
  }
}

