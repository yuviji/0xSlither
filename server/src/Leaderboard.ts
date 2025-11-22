import { SnakeEntity } from './Snake';
import { LeaderboardEntry, LEADERBOARD_SIZE } from 'shared';

export class Leaderboard {
  static compute(snakes: SnakeEntity[]): LeaderboardEntry[] {
    return snakes
      .filter(snake => snake.alive)
      .map(snake => ({
        name: snake.name,
        score: snake.getScore(),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE);
  }
}

