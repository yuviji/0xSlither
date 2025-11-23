import { StateMessage } from '@0xslither/shared';

export class UI {
  private startScreen: HTMLElement;
  private deathScreen: HTMLElement;
  private deathScreenTitle: HTMLElement;
  private leaderboard: HTMLElement;
  private leaderboardList: HTMLElement;
  private connectionStatus: HTMLElement;
  private playButton: HTMLButtonElement;
  private respawnButton: HTMLButtonElement;
  private finalScoreElement: HTMLElement;
  private bestScoreDisplay: HTMLElement;
  private connectWalletButton: HTMLButtonElement;
  private walletStatus: HTMLElement;
  private stakeSection: HTMLElement;
  private stakeButton: HTMLButtonElement;
  private tokenBalance: HTMLElement;
  private onChainStats: HTMLElement;
  private bestScore: HTMLElement;
  private currentStake: HTMLElement;
  private gameControls: HTMLElement;
  private tapOutButton: HTMLButtonElement;
  private loadingOverlay: HTMLElement;
  private loadingMessage: HTMLElement;
  private retryButton: HTMLButtonElement;

  constructor() {
    this.startScreen = document.getElementById('startScreen')!;
    this.deathScreen = document.getElementById('deathScreen')!;
    this.deathScreenTitle = document.getElementById('deathScreenTitle')!;
    this.leaderboard = document.getElementById('leaderboard')!;
    this.leaderboardList = document.getElementById('leaderboardList')!;
    this.connectionStatus = document.getElementById('connectionStatus')!;
    this.playButton = document.getElementById('playButton') as HTMLButtonElement;
    this.respawnButton = document.getElementById('respawnButton') as HTMLButtonElement;
    this.finalScoreElement = document.getElementById('finalScore')!;
    this.bestScoreDisplay = document.getElementById('bestScoreDisplay')!;
    this.connectWalletButton = document.getElementById('connectWalletButton') as HTMLButtonElement;
    this.walletStatus = document.getElementById('walletStatus')!;
    this.stakeSection = document.getElementById('stakeSection')!;
    this.stakeButton = document.getElementById('stakeButton') as HTMLButtonElement;
    this.tokenBalance = document.getElementById('tokenBalance')!;
    this.onChainStats = document.getElementById('onChainStats')!;
    this.bestScore = document.getElementById('bestScore')!;
    this.currentStake = document.getElementById('currentStake')!;
    this.gameControls = document.getElementById('gameControls')!;
    this.tapOutButton = document.getElementById('tapOutButton') as HTMLButtonElement;
    this.loadingOverlay = document.getElementById('loadingOverlay')!;
    this.loadingMessage = document.getElementById('loadingMessage')!;
    this.retryButton = document.getElementById('retryButton') as HTMLButtonElement;
  }

  showStartScreen(): void {
    this.startScreen.classList.remove('hidden');
    this.deathScreen.classList.add('hidden');
    this.leaderboard.classList.add('hidden');
  }

  hideStartScreen(): void {
    this.startScreen.classList.add('hidden');
    this.leaderboard.classList.remove('hidden');
    this.gameControls.classList.remove('hidden');
    this.onChainStats.classList.remove('hidden');
  }

  showDeathScreen(score: number): void {
    this.deathScreen.classList.remove('hidden');
    this.finalScoreElement.textContent = score.toString();
    
    // Reset title to default
    this.deathScreenTitle.textContent = 'You Died!';
    this.deathScreenTitle.style.color = '#00ff88';
    
    // Set best score to loading initially
    const scoreSpan = this.bestScoreDisplay.querySelector('.score');
    if (scoreSpan) {
      scoreSpan.textContent = 'Loading...';
    }
  }

  hideDeathScreen(): void {
    this.deathScreen.classList.add('hidden');
  }

  updateConnectionStatus(status: string): void {
    this.connectionStatus.textContent = status;
    
    if (status === 'Connected') {
      this.connectionStatus.style.background = 'rgba(0, 255, 136, 0.2)';
      this.connectionStatus.style.borderColor = 'rgba(0, 255, 136, 0.5)';
      this.connectionStatus.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.3)';
    } else if (status === 'Disconnected') {
      this.connectionStatus.style.background = 'rgba(255, 51, 102, 0.2)';
      this.connectionStatus.style.borderColor = 'rgba(255, 51, 102, 0.5)';
      this.connectionStatus.style.boxShadow = '0 0 15px rgba(255, 51, 102, 0.3)';
    } else {
      this.connectionStatus.style.background = 'rgba(255, 204, 0, 0.2)';
      this.connectionStatus.style.borderColor = 'rgba(255, 204, 0, 0.5)';
      this.connectionStatus.style.boxShadow = '0 0 15px rgba(255, 204, 0, 0.3)';
    }
  }

  updateLeaderboard(state: StateMessage): void {
    this.leaderboardList.innerHTML = '';
    
    state.leaderboard.forEach(([name, score, address]: [string, number, string?], index: number) => {
      const li = document.createElement('li');
      // Since name is now the wallet address, just display the shortened address
      const displayName = this.shortenAddress(address || name);
      li.innerHTML = `
        <span class="name">${index + 1}. ${displayName}</span>
        <span class="score">${score}</span>
      `;
      this.leaderboardList.appendChild(li);
    });
  }

  private shortenAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  onPlay(callback: () => void): void {
    this.playButton.addEventListener('click', () => {
      callback();
    });
  }

  onRespawn(callback: () => void): void {
    this.respawnButton.addEventListener('click', () => {
      callback();
    });
  }

  onConnectWallet(callback: () => Promise<string | null>): void {
    this.connectWalletButton.addEventListener('click', async () => {
      this.connectWalletButton.disabled = true;
      this.walletStatus.textContent = 'Connecting...';
      this.walletStatus.className = '';
      
      const address = await callback();
      
      this.connectWalletButton.disabled = false;
      
      if (address) {
        this.setWalletConnected(address);
      } else {
        this.walletStatus.textContent = 'Connection failed. Please try again.';
        this.walletStatus.className = 'error';
      }
    });
  }

  setWalletConnected(address: string): void {
    this.connectWalletButton.textContent = 'Wallet Connected';
    this.connectWalletButton.disabled = true;
    this.walletStatus.textContent = `Connected: ${this.shortenAddress(address)}`;
    this.walletStatus.className = 'success';
    this.stakeSection.classList.remove('hidden');
    this.stakeButton.disabled = false;
  }

  updateWalletAddress(address: string): void {
    this.walletStatus.textContent = `Connected: ${this.shortenAddress(address)}`;
    this.walletStatus.className = 'success';
  }

  setWalletNotConnected(): void {
    this.connectWalletButton.textContent = 'Connect Wallet';
    this.connectWalletButton.disabled = false;
    this.walletStatus.textContent = 'Not connected';
    this.walletStatus.className = '';
    this.stakeSection.classList.add('hidden');
    this.playButton.classList.add('hidden');
  }

  setStaked(): void {
    this.stakeButton.textContent = '✓ Staked';
    this.stakeButton.disabled = true;
    this.playButton.classList.remove('hidden');
    this.playButton.disabled = false;
  }

  resetStakeState(): void {
    this.stakeButton.textContent = 'Stake 1 SSS';
    this.stakeButton.disabled = false;
    this.playButton.classList.add('hidden');
    this.playButton.disabled = true;
  }

  setWalletNotAvailable(): void {
    this.connectWalletButton.disabled = true;
    this.walletStatus.textContent = 'No wallet detected. Cannot play.';
    this.walletStatus.className = 'error';
  }

  updateTokenBalance(balance: string): void {
    this.tokenBalance.textContent = balance;
  }

  getStakeAmount(): string {
    return '1'; // Fixed stake amount
  }

  onStake(callback: () => void): void {
    this.stakeButton.addEventListener('click', () => {
      callback();
    });
  }

  updateOnChainStats(bestScore: number, currentStake: string): void {
    this.bestScore.textContent = bestScore.toString();
    this.currentStake.textContent = `${currentStake} SSS`;
    
    // Also update the best score on death screen if visible
    if (!this.deathScreen.classList.contains('hidden')) {
      const scoreSpan = this.bestScoreDisplay.querySelector('.score');
      if (scoreSpan) {
        scoreSpan.textContent = bestScore.toString();
      }
    }
  }

  updateDeathScreenWithBestScore(finalScore: number, bestScore: number): void {
    // Update the best score display
    const scoreSpan = this.bestScoreDisplay.querySelector('.score');
    if (scoreSpan) {
      scoreSpan.textContent = bestScore.toString();
    }

    // If it's a new high score, update the title
    if (finalScore >= bestScore && finalScore > 0) {
      this.deathScreenTitle.textContent = 'New High Score!';
      this.deathScreenTitle.style.color = '#FFD700'; // Gold color
    } else {
      this.deathScreenTitle.textContent = 'You Died!';
      this.deathScreenTitle.style.color = '#00ff88'; // Reset to default
    }
  }

  onTapOut(callback: () => void): void {
    this.tapOutButton.addEventListener('click', () => {
      callback();
    });
  }

  setTapOutEnabled(enabled: boolean): void {
    this.tapOutButton.disabled = !enabled;
  }

  showGameControls(): void {
    this.gameControls.classList.remove('hidden');
  }

  hideGameControls(): void {
    this.gameControls.classList.add('hidden');
  }

  showLoading(message: string): void {
    this.loadingMessage.textContent = message;
    this.retryButton.classList.add('hidden');
    this.loadingOverlay.classList.remove('hidden');
  }

  hideLoading(): void {
    this.loadingOverlay.classList.add('hidden');
  }

  showLoadingWithRetry(message: string): void {
    this.loadingMessage.textContent = message;
    this.retryButton.classList.remove('hidden');
    this.loadingOverlay.classList.remove('hidden');
  }

  showError(message: string, duration: number = 5000): void {
    // Create or get error notification element
    let errorNotification = document.getElementById('errorNotification');
    
    if (!errorNotification) {
      errorNotification = document.createElement('div');
      errorNotification.id = 'errorNotification';
      errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 51, 102, 0.95);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        border: 2px solid rgba(255, 51, 102, 1);
        box-shadow: 0 4px 15px rgba(255, 51, 102, 0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: 'Orbitron', sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      `;
      document.body.appendChild(errorNotification);
    }
    
    errorNotification.textContent = message;
    errorNotification.style.display = 'block';
    
    // Auto-hide after duration
    setTimeout(() => {
      if (errorNotification) {
        errorNotification.style.display = 'none';
      }
    }, duration);
  }

  onRetry(callback: () => void): void {
    this.retryButton.addEventListener('click', () => {
      callback();
    });
  }
}

