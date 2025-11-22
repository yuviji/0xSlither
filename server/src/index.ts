import { WebSocketServer, WebSocket } from 'ws';
import { GameServer } from './GameServer';
import {
  ClientMessage,
  ServerMessage,
  MessageType,
  DeadMessage,
  isJoinMessage,
  isInputMessage,
  isPingMessage,
} from 'shared';

const PORT = process.env.PORT || 8080;

class Player {
  constructor(
    public ws: WebSocket,
    public id: string,
    public snakeId: string | null = null
  ) {}
}

class WebSocketGameServer {
  private wss: WebSocketServer;
  private gameServer: GameServer;
  private players: Map<WebSocket, Player> = new Map();
  private nextPlayerId = 0;
  private broadcastInterval: NodeJS.Timeout | null = null;

  constructor(port: number) {
    this.gameServer = new GameServer();
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));
    
    console.log(`WebSocket server listening on port ${port}`);
  }

  start(): void {
    this.gameServer.start();
    
    // Broadcast game state at server tick rate
    this.broadcastInterval = setInterval(() => {
      this.broadcastGameState();
      this.checkDeadSnakes();
    }, 50); // 20 times per second
  }

  private handleConnection(ws: WebSocket): void {
    const playerId = `player-${this.nextPlayerId++}`;
    const player = new Player(ws, playerId);
    this.players.set(ws, player);
    
    console.log(`Player ${playerId} connected`);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        this.handleMessage(player, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(player);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for player ${playerId}:`, error);
    });
  }

  private handleMessage(player: Player, message: ClientMessage): void {
    if (isJoinMessage(message)) {
      this.handleJoin(player, message.name, message.address);
    } else if (isInputMessage(message)) {
      this.handleInput(player, message.targetAngle);
    } else if (isPingMessage(message)) {
      this.handlePing(player, message.timestamp);
    }
  }

  private handleJoin(player: Player, name: string, address?: string): void {
    // Remove old snake if exists
    if (player.snakeId) {
      this.gameServer.removeSnake(player.snakeId);
    }

    // Create new snake with optional wallet address
    const snake = this.gameServer.addSnake(player.id, name, address);
    player.snakeId = snake.id;

    const addressLog = address ? ` with wallet ${address}` : ' as guest';
    console.log(`Player ${player.id} joined as "${name}"${addressLog}`);

    // Send initial state with player ID
    const state = this.gameServer.getGameState();
    this.sendMessage(player.ws, { ...state, yourId: player.id });
  }

  private handleInput(player: Player, targetAngle: number): void {
    if (player.snakeId) {
      this.gameServer.setSnakeTargetAngle(player.snakeId, targetAngle);
    }
  }

  private handlePing(player: Player, timestamp: number): void {
    this.sendMessage(player.ws, {
      type: MessageType.PONG,
      timestamp,
    });
  }

  private handleDisconnect(player: Player): void {
    console.log(`Player ${player.id} disconnected`);
    
    if (player.snakeId) {
      this.gameServer.removeSnake(player.snakeId);
    }
    
    this.players.delete(player.ws);
  }

  private broadcastGameState(): void {
    const state = this.gameServer.getGameState();
    const message = JSON.stringify(state);
    
    for (const [ws, player] of this.players) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  private checkDeadSnakes(): void {
    for (const [ws, player] of this.players) {
      if (player.snakeId && this.gameServer.isSnakeDead(player.snakeId)) {
        const score = this.gameServer.getSnakeScore(player.snakeId);
        const deadMessage: DeadMessage = {
          type: MessageType.DEAD,
          finalScore: score,
        };
        
        this.sendMessage(ws, deadMessage);
        
        // Don't remove the snake yet - player can respawn
        player.snakeId = null;
      }
    }
  }

  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

// Start the server
const server = new WebSocketGameServer(Number(PORT));
server.start();

console.log(`
╔═══════════════════════════════════════╗
║   Slither.io Server Running           ║
║   Port: ${PORT}                       ║
║   Ready for connections!              ║
╚═══════════════════════════════════════╝
`);

