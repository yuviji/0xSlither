import {
  Pellet,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PELLET_MIN_SIZE,
  PELLET_MAX_SIZE,
  PELLET_COLORS,
} from '@0xslither/shared';

export class PelletManager {
  private pellets: Map<string, Pellet> = new Map();
  private nextId = 0;
  private deterministicMode: boolean = false;

  constructor(count: number, initialPellets?: Array<{ x: number; y: number; size: number; color: string }>) {
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
        this.spawnPellet();
      }
      console.log(`⚠️  Pellet field initialized with random positions (${count} pellets)`);
    }
  }

  private addPellet(x: number, y: number, size: number, color: string): void {
    const pellet: Pellet = {
      id: `pellet-${this.nextId++}`,
      x,
      y,
      size,
      color,
    };
    this.pellets.set(pellet.id, pellet);
  }

  private spawnPellet(): void {
    const pellet: Pellet = {
      id: `pellet-${this.nextId++}`,
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      size: PELLET_MIN_SIZE + Math.random() * (PELLET_MAX_SIZE - PELLET_MIN_SIZE),
      color: PELLET_COLORS[Math.floor(Math.random() * PELLET_COLORS.length)],
    };
    
    this.pellets.set(pellet.id, pellet);
  }

  removePellet(id: string): void {
    this.pellets.delete(id);
    // Immediately respawn
    this.spawnPellet();
  }

  getPellets(): Pellet[] {
    return Array.from(this.pellets.values());
  }

  getPellet(id: string): Pellet | undefined {
    return this.pellets.get(id);
  }
}

