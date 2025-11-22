import { Game } from './Game';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import { UI } from './UI';
import { TICK_INTERVAL } from 'shared';

// WebSocket server URL (adjust for production)
const WS_URL = `ws://${window.location.hostname}:8080`;

class GameClient {
  private game: Game;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private ui: UI;
  private canvas: HTMLCanvasElement;
  private isPlaying = false;
  private lastInputTime = 0;
  private inputThrottle = 50; // Send input at most every 50ms
  private animationFrameId: number | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.inputHandler = new InputHandler(this.canvas);
    this.ui = new UI();
    this.game = new Game(WS_URL);

    this.setupEventHandlers();
    this.ui.showStartScreen();
  }

  private setupEventHandlers(): void {
    this.game.onConnected(() => {
      console.log('Connected to game server');
      this.ui.updateConnectionStatus('Connected');
    });

    this.game.onStateUpdate((state) => {
      this.ui.updateLeaderboard(state);
    });

    this.game.onDead((score) => {
      console.log('Player died with score:', score);
      this.isPlaying = false;
      this.ui.showDeathScreen(score);
    });

    this.ui.onPlay((name) => {
      this.startPlaying(name);
    });

    this.ui.onRespawn(() => {
      const name = (document.getElementById('nameInput') as HTMLInputElement).value.trim() || 'Anonymous';
      this.startPlaying(name);
    });
  }

  private startPlaying(name: string): void {
    this.game.join(name);
    this.ui.hideStartScreen();
    this.ui.hideDeathScreen();
    this.isPlaying = true;

    if (!this.animationFrameId) {
      this.gameLoop();
    }
  }

  private gameLoop = (): void => {
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    if (!this.isPlaying) return;

    const playerSnake = this.game.getPlayerSnake();
    if (!playerSnake) return;

    // Send input to server (throttled)
    const now = Date.now();
    if (now - this.lastInputTime > this.inputThrottle) {
      const targetAngle = this.inputHandler.getTargetAngle(
        playerSnake.head[0],
        playerSnake.head[1],
        this.renderer.getCamera()
      );
      this.game.sendInput(targetAngle);
      this.lastInputTime = now;
    }
  }

  private render(): void {
    const state = this.game.getCurrentState();
    if (!state) return;

    // Get interpolated state for smoother visuals
    const interpolatedState = this.game.getInterpolatedState();
    if (interpolatedState) {
      this.renderer.render(interpolatedState, this.game.getPlayerId());
    } else {
      this.renderer.render(state, this.game.getPlayerId());
    }
  }
}

// Initialize the game when the page loads
new GameClient();

console.log('%cSlither.io Core Game Started!', 'color: #4ECDC4; font-size: 20px; font-weight: bold;');
console.log('Controls: Move your mouse to control your snake');

