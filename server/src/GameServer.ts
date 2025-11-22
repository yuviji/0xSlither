import { SnakeEntity } from './Snake';
import { PelletManager } from './Pellet';
import { CollisionDetection } from './CollisionDetection';
import { Leaderboard } from './Leaderboard';
import {
  StateMessage,
  MessageType,
  SerializedSnake,
  SerializedPellet,
  TICK_INTERVAL,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PELLET_COUNT,
} from 'shared';

export class GameServer {
  private snakes: Map<string, SnakeEntity> = new Map();
  private pelletManager: PelletManager;
  private tickCount = 0;
  private lastTickTime = Date.now();
  private gameLoop: NodeJS.Timeout | null = null;

  constructor() {
    this.pelletManager = new PelletManager(PELLET_COUNT);
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
    const deadSnakeIds = CollisionDetection.checkSnakeCollisions(aliveSnakes);
    
    for (const snakeId of deadSnakeIds) {
      const snake = this.snakes.get(snakeId);
      if (snake) {
        snake.kill();
      }
    }

    // Check world bounds
    for (const snake of this.snakes.values()) {
      if (snake.alive && CollisionDetection.checkWorldBounds(snake, WORLD_WIDTH, WORLD_HEIGHT)) {
        snake.kill();
      }
    }
  }

  addSnake(id: string, name: string): SnakeEntity {
    // Generate random spawn position (not too close to edges)
    const margin = 200;
    const x = margin + Math.random() * (WORLD_WIDTH - 2 * margin);
    const y = margin + Math.random() * (WORLD_HEIGHT - 2 * margin);
    
    // Generate color based on player ID
    const hue = parseInt(id.slice(-6), 36) % 360;
    const color = `hsl(${hue}, 70%, 60%)`;
    
    const snake = new SnakeEntity(id, name, x, y, color);
    this.snakes.set(id, snake);
    
    console.log(`Snake ${name} (${id}) spawned at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    
    return snake;
  }

  removeSnake(id: string): void {
    this.snakes.delete(id);
    console.log(`Snake ${id} removed`);
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
      leaderboard: leaderboard.map(entry => [entry.name, entry.score] as [string, number]),
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

