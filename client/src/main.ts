import { Game } from './Game';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import { UI } from './UI';
import { WalletService } from './WalletService';
import { TICK_INTERVAL, MessageType, TapOutMessage } from 'shared';

// WebSocket server URL (adjust for production)
const WSS_URL = import.meta.env.VITE_WSS_URL;

// Contract addresses (configure these after deployment)
const STAKE_ARENA_ADDRESS = import.meta.env.VITE_STAKE_ARENA_ADDRESS as string;

// Match ID (will be provided by server or generated)
let CURRENT_MATCH_ID = `match-${Date.now()}`;

class GameClient {
  private game: Game;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private ui: UI;
  private wallet: WalletService | null = null;
  private canvas: HTMLCanvasElement;
  private isPlaying = false;
  private lastInputTime = 0;
  private inputThrottle = 50; // Send input at most every 50ms
  private animationFrameId: number | null = null;
  private walletAddress: string | null = null;
  private statsUpdateInterval: number | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.inputHandler = new InputHandler(this.canvas);
    this.ui = new UI();
    this.game = new Game(WSS_URL);

    // Wallet is now required
    this.wallet = new WalletService();

    this.setupEventHandlers();
    this.ui.showStartScreen();
    this.checkWalletAvailability();
  }

  private checkWalletAvailability(): void {
    if (!this.isWalletAvailable()) {
      this.ui.setWalletNotAvailable();
    }
  }

  private isWalletAvailable(): boolean {
    return typeof (window as any).ethereum !== 'undefined';
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
      this.stopStatsUpdates();
    });

    this.ui.onPlay(async () => {
      await this.startPlaying();
    });

    this.ui.onRespawn(async () => {
      await this.startPlaying();
    });

    this.ui.onConnectWallet(async () => {
      return await this.connectWallet();
    });

    this.ui.onTapOut(async () => {
      await this.handleTapOut();
    });
  }

  private async connectWallet(): Promise<string | null> {
    if (!this.wallet) {
      console.error('Wallet service not available');
      return null;
    }

    try {
      this.walletAddress = await this.wallet.connectWallet();
      
      if (this.walletAddress) {
        // Initialize contracts if blockchain enabled
        if (STAKE_ARENA_ADDRESS) {
          this.wallet.initializeContracts(STAKE_ARENA_ADDRESS);
          console.log('✅ Wallet connected and contracts initialized');
        } else {
          console.log('✅ Wallet connected (blockchain features disabled)');
        }
        
        // Update balance
        const balance = await this.wallet.getTokenBalance();
        this.ui.updateTokenBalance(balance);
      }
      
      return this.walletAddress;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return null;
    }
  }

  private async startPlaying(): Promise<void> {
    // Wallet is required to play
    if (!this.walletAddress) {
      alert('Please connect your wallet to play');
      return;
    }

    // If blockchain enabled, stake first
    if (STAKE_ARENA_ADDRESS) {
      const stakeAmount = this.ui.getStakeAmount();
      
      if (parseFloat(stakeAmount) <= 0) {
        alert('Please enter a valid stake amount');
        return;
      }

      try {
        console.log(`Staking ${stakeAmount} SSS...`);
        this.ui.updateConnectionStatus('Entering match...');
        
        // Enter match
        const entered = await this.wallet!.enterMatch(CURRENT_MATCH_ID, stakeAmount);
        if (!entered) {
          alert('Failed to enter match');
          this.ui.updateConnectionStatus('Connected');
          return;
        }

        console.log('✅ Successfully staked and entered match');
        this.ui.updateConnectionStatus('Connected');
      } catch (error) {
        console.error('Error during stake process:', error);
        alert('Failed to stake tokens. See console for details.');
        this.ui.updateConnectionStatus('Connected');
        return;
      }
    }

    // Use wallet address as the player name
    this.game.join(this.walletAddress, this.walletAddress);
    this.ui.hideStartScreen();
    this.ui.hideDeathScreen();
    this.isPlaying = true;

    if (!this.animationFrameId) {
      this.gameLoop();
    }

    // Start updating on-chain stats if blockchain enabled
    if (STAKE_ARENA_ADDRESS) {
      this.startStatsUpdates();
    }
  }

  private async handleTapOut(): Promise<void> {
    if (!this.wallet || !this.walletAddress) {
      console.log('Cannot tap out: wallet not connected');
      return;
    }

    if (!STAKE_ARENA_ADDRESS) {
      console.log('Cannot tap out: blockchain not enabled');
      return;
    }

    const confirmed = confirm('Are you sure you want to tap out and withdraw your stake?');
    if (!confirmed) return;

    try {
      this.ui.updateConnectionStatus('Tapping out...');
      
      // Send tap out message to server
      const tapOutMsg: TapOutMessage = {
        type: MessageType.TAPOUT,
        matchId: CURRENT_MATCH_ID,
      };
      
      // Note: We need to add a method to send custom messages to the game
      // For now, the server will handle removal when we call tapOut on contract
      
      // Call contract
      const success = await this.wallet.tapOut(CURRENT_MATCH_ID);
      
      if (success) {
        console.log('✅ Successfully tapped out');
        this.ui.updateConnectionStatus('Connected');
        this.isPlaying = false;
        this.ui.showStartScreen();
        this.stopStatsUpdates();
        
        // Update balance
        const balance = await this.wallet.getTokenBalance();
        this.ui.updateTokenBalance(balance);
      } else {
        alert('Failed to tap out. See console for details.');
        this.ui.updateConnectionStatus('Connected');
      }
    } catch (error) {
      console.error('Error tapping out:', error);
      alert('Failed to tap out. See console for details.');
      this.ui.updateConnectionStatus('Connected');
    }
  }

  private startStatsUpdates(): void {
    this.updateOnChainStats();
    this.statsUpdateInterval = window.setInterval(() => {
      this.updateOnChainStats();
    }, 10000); // Update every 10 seconds
  }

  private stopStatsUpdates(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
  }

  private async updateOnChainStats(): Promise<void> {
    if (!this.wallet || !this.walletAddress) return;

    try {
      const bestScore = await this.wallet.getBestScore();
      const currentStake = await this.wallet.getCurrentStake(CURRENT_MATCH_ID);
      this.ui.updateOnChainStats(bestScore, currentStake);
    } catch (error) {
      console.error('Error updating on-chain stats:', error);
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

console.log('%c0xSlither Game Started!', 'color: #9B59B6; font-size: 20px; font-weight: bold;');
console.log('Controls: Move your mouse to control your snake');
console.log('⚠️  Wallet connection required to play');
if (STAKE_ARENA_ADDRESS) {
  console.log('🔗 Blockchain features enabled (Native SSS token)');
} else {
  console.log('ℹ️  Set VITE_STAKE_ARENA_ADDRESS to enable blockchain features');
}

