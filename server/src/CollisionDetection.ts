import { SnakeEntity } from './Snake';
import { Pellet, SNAKE_HEAD_RADIUS, COLLISION_DISTANCE } from 'shared';

export class CollisionDetection {
  static checkPelletCollision(snake: SnakeEntity, pellet: Pellet): boolean {
    const dx = snake.headPosition.x - pellet.x;
    const dy = snake.headPosition.y - pellet.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < SNAKE_HEAD_RADIUS + pellet.size;
  }

  static checkSnakeCollisions(snakes: SnakeEntity[]): Set<string> {
    const deadSnakeIds = new Set<string>();

    for (const snake of snakes) {
      if (!snake.alive) continue;

      // Check collision with all other snakes' body segments
      for (const otherSnake of snakes) {
        if (!otherSnake.alive) continue;
        
        // Check against all segments (including head for other snakes)
        const segmentsToCheck = otherSnake.segments;
        
        for (let i = 0; i < segmentsToCheck.length; i++) {
          const segment = segmentsToCheck[i];
          
          // Skip checking against own first 3 segments to prevent immediate self-collision
          // A snake can only hit its own body if it's long enough and turns back on itself
          if (snake.id === otherSnake.id && i < 3) {
            continue;
          }

          const dx = snake.headPosition.x - segment.x;
          const dy = snake.headPosition.y - segment.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < COLLISION_DISTANCE) {
            deadSnakeIds.add(snake.id);
            break;
          }
        }
        
        if (deadSnakeIds.has(snake.id)) break;
      }
    }

    return deadSnakeIds;
  }

  static checkWorldBounds(snake: SnakeEntity, worldWidth: number, worldHeight: number): boolean {
    const margin = 50; // Kill if too far outside
    return (
      snake.headPosition.x < -margin ||
      snake.headPosition.x > worldWidth + margin ||
      snake.headPosition.y < -margin ||
      snake.headPosition.y > worldHeight + margin
    );
  }
}

