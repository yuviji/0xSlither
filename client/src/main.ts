import { Game } from './Game';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import { UI } from './UI';
import { WalletService } from './WalletService';
import { TICK_INTERVAL, MessageType, TapOutMessage } from '@0xslither/shared';

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
  private isSpectating = false;
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
    
    // Start game loop immediately for spectator mode
    this.gameLoop();
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
      // Update match ID from server if provided (only once)
      if (state.matchId && state.matchId !== CURRENT_MATCH_ID) {
        CURRENT_MATCH_ID = state.matchId;
        console.log('Match ID updated from server:', CURRENT_MATCH_ID);
      }
    });

    this.game.onPlayerIdReceived((playerId) => {
      console.log('Player ID received, enabling gameplay:', playerId);
      // Now that we have a player ID, we can start playing
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.ui.hideStartScreen();
        this.ui.hideDeathScreen();
        
        // Start updating on-chain stats if blockchain enabled
        if (STAKE_ARENA_ADDRESS) {
          this.startStatsUpdates();
        }
      }
    });

    this.game.onDead(async (score) => {
      console.log('Player died with score:', score);
      this.isPlaying = false;
      this.isSpectating = true;
      this.ui.showDeathScreen(score);
      this.ui.hideGameControls(); // Hide tap out button after death
      this.stopStatsUpdates();
      
      // Wait for blockchain transaction to process, then update stats one final time
      setTimeout(async () => {
        await this.updateOnChainStatsAfterDeath(score);
        console.log('Final stats updated after death');
      }, 3000); // Wait 3 seconds for blockchain confirmation
    });

    this.ui.onStake(async () => {
      await this.handleStake();
    });

    this.ui.onPlay(async () => {
      await this.startPlaying();
    });

    this.ui.onRespawn(async () => {
      // Reset state and return to home page for a clean restart
      this.isPlaying = false;
      this.isSpectating = false;
      this.ui.hideDeathScreen();
      this.ui.resetStakeState();
      this.ui.showStartScreen();
      this.stopStatsUpdates();
    });

    this.ui.onConnectWallet(async () => {
      return await this.connectWallet();
    });

    this.ui.onTapOut(async () => {
      await this.handleTapOut();
    });

    this.ui.onRetry(async () => {
      // Get score again in case we need to retry
      const playerSnake = this.game.getPlayerSnake();
      const currentScore = playerSnake ? playerSnake.segments.length : 0;
      await this.attemptTapOutTransaction(currentScore);
    });
  }

  private async connectWallet(): Promise<string | null> {
    if (!this.wallet) {
      console.error('Wallet service not available');
      return null;
    }

    try {
      this.ui.showLoading('Connecting to MetaMask...');
      this.walletAddress = await this.wallet.connectWallet();
      
      if (this.walletAddress) {
        // Initialize contracts if blockchain enabled
        if (STAKE_ARENA_ADDRESS) {
          this.wallet.initializeContracts(STAKE_ARENA_ADDRESS);
          console.log('✅ Wallet connected and contracts initialized');
        } else {
          console.log('✅ Wallet connected (blockchain features disabled)');
        }
        
        // Set up wallet event listeners
        this.wallet.setupWalletListeners(
          // On account change
          (newAddress) => {
            if (newAddress) {
              console.log('Account changed to:', newAddress);
              this.walletAddress = newAddress;
              this.ui.updateWalletAddress(newAddress);
              // Update balance for new account
              this.wallet?.getTokenBalance().then(balance => {
                this.ui.updateTokenBalance(balance);
              });
            } else {
              console.log('Wallet disconnected');
              this.walletAddress = null;
              this.ui.setWalletNotConnected();
            }
          },
          // On network change
          async () => {
            console.warn('⚠️ Network changed! Checking if on correct network...');
            const isCorrect = await this.wallet?.isOnCorrectNetwork();
            if (!isCorrect) {
              this.ui.showError('Wrong network! Please switch back to 0xSlither Saga Chainlet');
            }
          }
        );
        
        // Update balance
        const balance = await this.wallet.getTokenBalance();
        this.ui.updateTokenBalance(balance);
      }
      
      this.ui.hideLoading();
      return this.walletAddress;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      this.ui.hideLoading();
      return null;
    }
  }

  private async handleStake(): Promise<void> {
    // Wallet is required to stake
    if (!this.walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    // If blockchain enabled, stake
    if (STAKE_ARENA_ADDRESS) {
      const stakeAmount = '1'; // Fixed stake amount
      
      try {
        console.log(`Staking ${stakeAmount} SSS...`);
        this.ui.showLoading(`Staking ${stakeAmount} SSS... Please sign the transaction in MetaMask.`);
        
        // Enter match
        await this.wallet!.enterMatch(CURRENT_MATCH_ID, stakeAmount);

        console.log('✅ Successfully staked and entered match');
        this.ui.hideLoading();
        this.ui.setStaked();
        
        // Update balance
        const balance = await this.wallet!.getTokenBalance();
        this.ui.updateTokenBalance(balance);
      } catch (error: any) {
        console.error('Error during stake process:', error);
        this.ui.hideLoading();
        
        // Check if user rejected the transaction
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
          alert('Transaction rejected. Please stake to play.');
        } else {
          alert('Failed to stake tokens. See console for details.');
        }
        return;
      }
    }
  }

  private async startPlaying(): Promise<void> {
    // Wallet is required to play
    if (!this.walletAddress) {
      alert('Please connect your wallet to play');
      return;
    }

    // Show loading state while waiting for server to assign player ID
    this.ui.showLoading('Joining game...');
    
    // Use wallet address as the player name
    // The actual playing state will be enabled when we receive the player ID from the server
    this.isSpectating = false;
    this.game.join(this.walletAddress, this.walletAddress);
    
    // Hide loading after a short delay (the onPlayerIdReceived callback will handle the rest)
    setTimeout(() => {
      this.ui.hideLoading();
    }, 1000);
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

    // Get current score before disconnecting
    const playerSnake = this.game.getPlayerSnake();
    const currentScore = playerSnake ? playerSnake.segments.length : 0;

    // Step 1: Immediately disconnect from game (remove player from server)
    this.isPlaying = false;
    this.isSpectating = true;
    this.stopStatsUpdates();
    this.ui.hideGameControls();
    this.ui.hideDeathScreen();
    
    // Send tap out message to server to remove snake immediately
    const tapOutMsg: TapOutMessage = {
      type: MessageType.TAPOUT,
      matchId: CURRENT_MATCH_ID,
    };
    this.game.sendCustomMessage(tapOutMsg);

    // Step 2: Attempt to withdraw stake via blockchain transaction with score
    await this.attemptTapOutTransaction(currentScore);
  }

  private async attemptTapOutTransaction(score: number): Promise<void> {
    if (!this.wallet || !this.walletAddress) return;

    try {
      this.ui.showLoading('Sign transaction to withdraw your stake and record your score...');
      
      // Call contract to withdraw with score
      const success = await this.wallet.tapOut(CURRENT_MATCH_ID, score);
      
      if (success) {
        console.log(`✅ Successfully tapped out, withdrawn stake, and recorded score: ${score}`);
        this.ui.hideLoading();
        
        // Update balance and stats
        const balance = await this.wallet.getTokenBalance();
        this.ui.updateTokenBalance(balance);
        
        // Update best score immediately
        const bestScore = await this.wallet.getBestScore();
        const currentStake = await this.wallet.getCurrentStake(CURRENT_MATCH_ID);
        this.ui.updateOnChainStats(bestScore, currentStake);
        
        // Return to home screen
        this.isSpectating = false;
        this.ui.resetStakeState();
        this.ui.showStartScreen();
      } else {
        // Transaction failed
        this.ui.showLoadingWithRetry('Transaction failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Error tapping out:', error);
      
      // Check if user rejected the transaction
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        this.ui.showLoadingWithRetry('Transaction rejected. Click retry to sign again.');
      } else {
        this.ui.showLoadingWithRetry('Transaction failed. Click retry to try again.');
      }
    }
  }

  private isSpectatorMode(): boolean {
    return this.isSpectating || !this.isPlaying;
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

  private async updateOnChainStatsAfterDeath(finalScore: number): Promise<void> {
    if (!this.wallet || !this.walletAddress) return;

    try {
      const bestScoreFromChain = await this.wallet.getBestScore();
      const currentStake = await this.wallet.getCurrentStake(CURRENT_MATCH_ID);
      
      // Display the higher of the final score or the on-chain best score
      const displayScore = Math.max(finalScore, bestScoreFromChain);
      
      console.log(`Final score: ${finalScore}, On-chain best: ${bestScoreFromChain}, Displaying: ${displayScore}`);
      
      // Update on-chain stats panel
      this.ui.updateOnChainStats(displayScore, currentStake);
      
      // Update death screen with best score info
      this.ui.updateDeathScreenWithBestScore(finalScore, displayScore);
    } catch (error) {
      console.error('Error updating on-chain stats after death:', error);
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

    const playerId = this.game.getPlayerId();
    const isSpectator = this.isSpectatorMode();

    // Get interpolated state for smoother visuals
    const interpolatedState = this.game.getInterpolatedState();
    const renderState = interpolatedState || state;

    if (isSpectator) {
      // Filter out dead player's snake from rendering
      const filteredState = {
        ...renderState,
        snakes: renderState.snakes.filter((snake: any) => snake.id !== playerId)
      };
      this.renderer.render(filteredState, null);
    } else {
      this.renderer.render(renderState, playerId);
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

