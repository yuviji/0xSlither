import { StateMessage, SerializedSnake, SNAKE_HEAD_RADIUS, SNAKE_SEGMENT_RADIUS } from 'shared';
import { Camera } from './Camera';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private camera: Camera;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = new Camera();
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  render(state: StateMessage, playerId: string | null): void {
    // Clear canvas
    this.ctx.fillStyle = '#0f3460';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update camera to follow player
    const playerSnake = state.snakes.find((s: any) => s.id === playerId);
    if (playerSnake) {
      this.camera.setTarget({ x: playerSnake.head[0], y: playerSnake.head[1] });
    }
    this.camera.update();

    // Draw grid
    this.drawGrid();

    // Draw pellets
    for (const pellet of state.pellets) {
      this.drawPellet(pellet);
    }

    // Draw snakes (bodies first, then heads)
    for (const snake of state.snakes) {
      this.drawSnakeBody(snake);
    }
    for (const snake of state.snakes) {
      this.drawSnakeHead(snake);
    }

    // Draw snake names
    for (const snake of state.snakes) {
      this.drawSnakeName(snake);
    }
  }

  private drawGrid(): void {
    const gridSize = 50;
    const startX = Math.floor((this.camera.x - this.canvas.width / 2) / gridSize) * gridSize;
    const startY = Math.floor((this.camera.y - this.canvas.height / 2) / gridSize) * gridSize;
    const endX = startX + this.canvas.width + gridSize;
    const endY = startY + this.canvas.height + gridSize;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    for (let x = startX; x < endX; x += gridSize) {
      const screenPos = this.camera.worldToScreen(x, 0, this.canvas.width, this.canvas.height);
      this.ctx.beginPath();
      this.ctx.moveTo(screenPos.x, 0);
      this.ctx.lineTo(screenPos.x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = startY; y < endY; y += gridSize) {
      const screenPos = this.camera.worldToScreen(0, y, this.canvas.width, this.canvas.height);
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenPos.y);
      this.ctx.lineTo(this.canvas.width, screenPos.y);
      this.ctx.stroke();
    }
  }

  private drawPellet(pellet: [number, number, number, string]): void {
    const [x, y, size, color] = pellet;
    const screenPos = this.camera.worldToScreen(x, y, this.canvas.width, this.canvas.height);

    // Skip if off-screen
    if (
      screenPos.x < -20 ||
      screenPos.x > this.canvas.width + 20 ||
      screenPos.y < -20 ||
      screenPos.y > this.canvas.height + 20
    ) {
      return;
    }

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSnakeBody(snake: SerializedSnake): void {
    for (const segment of snake.segments) {
      const screenPos = this.camera.worldToScreen(segment[0], segment[1], this.canvas.width, this.canvas.height);

      // Skip if off-screen
      if (
        screenPos.x < -50 ||
        screenPos.x > this.canvas.width + 50 ||
        screenPos.y < -50 ||
        screenPos.y > this.canvas.height + 50
      ) {
        continue;
      }

      // Draw segment with gradient
      const gradient = this.ctx.createRadialGradient(screenPos.x, screenPos.y, 0, screenPos.x, screenPos.y, SNAKE_SEGMENT_RADIUS);
      gradient.addColorStop(0, snake.color);
      gradient.addColorStop(1, this.darkenColor(snake.color, 0.7));

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, SNAKE_SEGMENT_RADIUS, 0, Math.PI * 2);
      this.ctx.fill();

      // Outline
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  private drawSnakeHead(snake: SerializedSnake): void {
    const screenPos = this.camera.worldToScreen(snake.head[0], snake.head[1], this.canvas.width, this.canvas.height);

    // Skip if off-screen
    if (
      screenPos.x < -50 ||
      screenPos.x > this.canvas.width + 50 ||
      screenPos.y < -50 ||
      screenPos.y > this.canvas.height + 50
    ) {
      return;
    }

    // Draw head with gradient
    const gradient = this.ctx.createRadialGradient(screenPos.x, screenPos.y, 0, screenPos.x, screenPos.y, SNAKE_HEAD_RADIUS);
    gradient.addColorStop(0, this.lightenColor(snake.color, 1.2));
    gradient.addColorStop(1, snake.color);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, SNAKE_HEAD_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();

    // Outline
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Eyes
    const eyeOffset = 4;
    const eyeSize = 2;
    const eyeX1 = screenPos.x + Math.cos(snake.angle - 0.5) * eyeOffset;
    const eyeY1 = screenPos.y + Math.sin(snake.angle - 0.5) * eyeOffset;
    const eyeX2 = screenPos.x + Math.cos(snake.angle + 0.5) * eyeOffset;
    const eyeY2 = screenPos.y + Math.sin(snake.angle + 0.5) * eyeOffset;

    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
    this.ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(eyeX1, eyeY1, eyeSize * 0.6, 0, Math.PI * 2);
    this.ctx.arc(eyeX2, eyeY2, eyeSize * 0.6, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSnakeName(snake: SerializedSnake): void {
    const screenPos = this.camera.worldToScreen(snake.head[0], snake.head[1], this.canvas.width, this.canvas.height);

    // Skip if off-screen
    if (
      screenPos.x < -50 ||
      screenPos.x > this.canvas.width + 50 ||
      screenPos.y < -50 ||
      screenPos.y > this.canvas.height + 50
    ) {
      return;
    }

    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';

    // Background
    const textWidth = this.ctx.measureText(snake.name).width;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(screenPos.x - textWidth / 2 - 4, screenPos.y - SNAKE_HEAD_RADIUS - 24, textWidth + 8, 18);

    // Text
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(snake.name, screenPos.x, screenPos.y - SNAKE_HEAD_RADIUS - 8);
  }

  private lightenColor(color: string, factor: number): string {
    // Parse HSL color
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      const h = parseInt(match[1]);
      const s = parseInt(match[2]);
      const l = Math.min(100, parseInt(match[3]) * factor);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return color;
  }

  private darkenColor(color: string, factor: number): string {
    return this.lightenColor(color, factor);
  }

  getCamera(): Camera {
    return this.camera;
  }
}

