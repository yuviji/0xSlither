// WebSocket message protocol

import { SerializedSnake, SerializedPellet, SerializedLeaderboard } from './types';

// Message types
export enum MessageType {
  JOIN = 'JOIN',
  INPUT = 'INPUT',
  STATE = 'STATE',
  DEAD = 'DEAD',
  PING = 'PING',
  PONG = 'PONG',
}

// Client to Server messages
export interface JoinMessage {
  type: MessageType.JOIN;
  name: string;
  address?: string; // Optional EVM wallet address
}

export interface InputMessage {
  type: MessageType.INPUT;
  targetAngle: number; // Desired angle in radians
}

export interface PingMessage {
  type: MessageType.PING;
  timestamp: number;
}

export type ClientMessage = JoinMessage | InputMessage | PingMessage;

// Server to Client messages
export interface StateMessage {
  type: MessageType.STATE;
  tick: number;
  snakes: SerializedSnake[];
  pellets: SerializedPellet[];
  leaderboard: SerializedLeaderboard;
  yourId?: string; // Only sent to new players
}

export interface DeadMessage {
  type: MessageType.DEAD;
  finalScore: number;
}

export interface PongMessage {
  type: MessageType.PONG;
  timestamp: number;
}

export type ServerMessage = StateMessage | DeadMessage | PongMessage;

// Type guards
export function isJoinMessage(msg: any): msg is JoinMessage {
  return msg.type === MessageType.JOIN && typeof msg.name === 'string' &&
    (msg.address === undefined || typeof msg.address === 'string');
}

export function isInputMessage(msg: any): msg is InputMessage {
  return msg.type === MessageType.INPUT && typeof msg.targetAngle === 'number';
}

export function isPingMessage(msg: any): msg is PingMessage {
  return msg.type === MessageType.PING && typeof msg.timestamp === 'number';
}

