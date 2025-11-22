import { WebSocketServer, WebSocket } from 'ws';
import { GameServer } from './GameServer';
import { BlockchainService } from './BlockchainService';
import * as dotenv from 'dotenv';
import {
  ClientMessage,
  ServerMessage,
  MessageType,
  DeadMessage,
  TapOutSuccessMessage,
  isJoinMessage,
  isInputMessage,
  isPingMessage,
  isTapOutMessage,
} from 'shared';

dotenv.config();

const PORT = process.env.PORT || 8080;
const BLOCKCHAIN_ENABLED = process.env.BLOCKCHAIN_ENABLED === 'true';

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
  private blockchain: BlockchainService | null = null;
  private matchId: string;
  private players: Map<WebSocket, Player> = new Map();
  private nextPlayerId = 0;
  private broadcastInterval: NodeJS.Timeout | null = null;

  constructor(port: number) {
    this.gameServer = new GameServer();
    this.wss = new WebSocketServer({ port });
    
    // Initialize blockchain if enabled
    if (BLOCKCHAIN_ENABLED) {
      try {
        const rpcUrl = process.env.SAGA_RPC_URL as string;
        const privateKey = process.env.SERVER_PRIVATE_KEY as string;
        const stakeArenaAddress = process.env.STAKE_ARENA_ADDRESS as string;

        if (!privateKey || !stakeArenaAddress) {
          console.warn('⚠️  Blockchain integration disabled: Missing SERVER_PRIVATE_KEY or STAKE_ARENA_ADDRESS');
        } else {
          this.blockchain = new BlockchainService(rpcUrl, privateKey, stakeArenaAddress);
          this.matchId = this.blockchain.generateMatchId(`match-${Date.now()}`);
          console.log('✅ Blockchain integration enabled (Native SSS)');
          console.log(`📝 Match ID: ${this.matchId}`);
        }
      } catch (error) {
        console.error('Failed to initialize blockchain:', error);
      }
    } else {
      console.log('ℹ️  Blockchain integration disabled (set BLOCKCHAIN_ENABLED=true to enable)');
    }
    
    this.matchId = `match-${Date.now()}`;
    this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));
    
    console.log(`WebSocket server listening on port ${port}`);
  }

  start(): void {
    this.gameServer.start();
    
    // Connect blockchain to game server if enabled
    if (this.blockchain) {
      this.gameServer.setBlockchainService(this.blockchain, this.matchId);
    }
    
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
    } else if (isTapOutMessage(message)) {
      this.handleTapOut(player, message.matchId);
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

  private async handleTapOut(player: Player, matchId: string): Promise<void> {
    if (!player.snakeId) {
      console.log(`Player ${player.id} tried to tap out without active snake`);
      return;
    }

    const snake = this.gameServer.getSnake(player.snakeId);
    if (!snake || !snake.address) {
      console.log(`Cannot tap out: no wallet address for player ${player.id}`);
      return;
    }

    console.log(`Player ${player.id} tapping out from match ${matchId}`);

    // Remove snake from game
    const finalStake = snake.getScore(); // Use score as proxy for stake
    this.gameServer.removeSnake(player.snakeId);
    player.snakeId = null;

    // Note: Actual withdrawal happens on-chain when player calls tapOut() from client
    // Server just removes them from the game
    const tapOutMsg: TapOutSuccessMessage = {
      type: MessageType.TAPOUT_SUCCESS,
      amountWithdrawn: finalStake,
    };
    this.sendMessage(player.ws, tapOutMsg);
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

