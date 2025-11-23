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

  constructor(count: number) {
    for (let i = 0; i < count; i++) {
      this.spawnPellet();
    }
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

