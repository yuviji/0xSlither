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
    
    state.leaderboard.forEach(([name, score]: [string, number], index: number) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="name">${index + 1}. ${name}</span>
        <span class="score">${score}</span>
      `;
      this.leaderboardList.appendChild(li);
    });
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
}

