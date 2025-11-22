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
  address?: string; // Optional EVM wallet address
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
  address?: string; // Optional EVM wallet address
}

// Serialized types for network transmission (more compact)
export type SerializedSnake = {
  id: string;
  name: string;
  address?: string; // Optional EVM wallet address
  head: [number, number];
  angle: number;
  segments: [number, number][];
  color: string;
};

export type SerializedPellet = [number, number, number, string]; // [x, y, size, color]

export type SerializedLeaderboard = [string, number, string?][]; // [name, score, address?]

