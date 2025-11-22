import { StateMessage } from 'shared';

export class UI {
  private startScreen: HTMLElement;
  private deathScreen: HTMLElement;
  private leaderboard: HTMLElement;
  private leaderboardList: HTMLElement;
  private connectionStatus: HTMLElement;
  private nameInput: HTMLInputElement;
  private playButton: HTMLButtonElement;
  private respawnButton: HTMLButtonElement;
  private finalScoreElement: HTMLElement;
  private connectWalletButton: HTMLButtonElement;
  private walletStatus: HTMLElement;
  private stakeSection: HTMLElement;
  private stakeInput: HTMLInputElement;
  private tokenBalance: HTMLElement;
  private onChainStats: HTMLElement;
  private bestScore: HTMLElement;
  private currentStake: HTMLElement;
  private gameControls: HTMLElement;
  private tapOutButton: HTMLButtonElement;

  constructor() {
    this.startScreen = document.getElementById('startScreen')!;
    this.deathScreen = document.getElementById('deathScreen')!;
    this.leaderboard = document.getElementById('leaderboard')!;
    this.leaderboardList = document.getElementById('leaderboardList')!;
    this.connectionStatus = document.getElementById('connectionStatus')!;
    this.nameInput = document.getElementById('nameInput') as HTMLInputElement;
    this.playButton = document.getElementById('playButton') as HTMLButtonElement;
    this.respawnButton = document.getElementById('respawnButton') as HTMLButtonElement;
    this.finalScoreElement = document.getElementById('finalScore')!;
    this.connectWalletButton = document.getElementById('connectWalletButton') as HTMLButtonElement;
    this.walletStatus = document.getElementById('walletStatus')!;
    this.stakeSection = document.getElementById('stakeSection')!;
    this.stakeInput = document.getElementById('stakeInput') as HTMLInputElement;
    this.tokenBalance = document.getElementById('tokenBalance')!;
    this.onChainStats = document.getElementById('onChainStats')!;
    this.bestScore = document.getElementById('bestScore')!;
    this.currentStake = document.getElementById('currentStake')!;
    this.gameControls = document.getElementById('gameControls')!;
    this.tapOutButton = document.getElementById('tapOutButton') as HTMLButtonElement;
  }

  showStartScreen(): void {
    this.startScreen.classList.remove('hidden');
    this.deathScreen.classList.add('hidden');
    this.leaderboard.classList.add('hidden');
    this.nameInput.focus();
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
  }

  hideDeathScreen(): void {
    this.deathScreen.classList.add('hidden');
  }

  updateConnectionStatus(status: string): void {
    this.connectionStatus.textContent = status;
    
    if (status === 'Connected') {
      this.connectionStatus.style.background = 'rgba(0, 255, 0, 0.3)';
    } else if (status === 'Disconnected') {
      this.connectionStatus.style.background = 'rgba(255, 0, 0, 0.3)';
    } else {
      this.connectionStatus.style.background = 'rgba(255, 255, 0, 0.3)';
    }
  }

  updateLeaderboard(state: StateMessage): void {
    this.leaderboardList.innerHTML = '';
    
    state.leaderboard.forEach(([name, score, address]: [string, number, string?], index: number) => {
      const li = document.createElement('li');
      const displayName = address ? `${name} (${this.shortenAddress(address)})` : name;
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

  onPlay(callback: (name: string) => void): void {
    const handler = () => {
      const name = this.nameInput.value.trim() || 'Anonymous';
      callback(name);
    };

    this.playButton.addEventListener('click', handler);
    this.nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handler();
      }
    });
  }

  onRespawn(callback: () => void): void {
    this.respawnButton.addEventListener('click', () => {
      this.hideDeathScreen();
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
        this.walletStatus.textContent = 'Connection failed. Continue as guest.';
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
    this.playButton.textContent = 'Stake & Play';
  }

  setWalletNotAvailable(): void {
    this.connectWalletButton.disabled = true;
    this.walletStatus.textContent = 'No wallet detected. Continue as guest.';
    this.walletStatus.className = '';
    this.playButton.textContent = 'Play as Guest';
  }

  updateTokenBalance(balance: string): void {
    this.tokenBalance.textContent = parseFloat(balance).toFixed(2);
  }

  getStakeAmount(): string {
    return this.stakeInput.value || '0';
  }

  updateOnChainStats(bestScore: number, currentStake: string): void {
    this.bestScore.textContent = bestScore.toString();
    this.currentStake.textContent = `${parseFloat(currentStake).toFixed(2)} SLTH`;
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
}

