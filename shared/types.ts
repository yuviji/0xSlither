// Shared types for game entities

export interface Position {
  x: number;
  y: number;
}

export interface SnakeSegment extends Position {
  radius: number;
}

export interface Snake {
  id: string;
  name: string;
  headPosition: Position;
  angle: number;
  segments: SnakeSegment[];
  length: number;
  color: string;
  alive: boolean;
}

export interface Pellet {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}

// Serialized types for network transmission (more compact)
export type SerializedSnake = {
  id: string;
  name: string;
  head: [number, number];
  angle: number;
  segments: [number, number][];
  color: string;
};

export type SerializedPellet = [number, number, number, string]; // [x, y, size, color]

export type SerializedLeaderboard = [string, number][]; // [name, score]

