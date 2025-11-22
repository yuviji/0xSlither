# 0xSlither

A real-time multiplayer Slither.io-style game built with TypeScript, Node.js, and WebSockets.

## Features

- **Real-time Multiplayer**: Authoritative server with WebSocket communication
- **Ultra-Smooth Movement**: Advanced client-side interpolation for jerkiness-free 60 FPS visuals
- **Collision Detection**: Precise snake-to-snake collisions and pellet consumption
- **Leaderboard**: Live top 5 players
- **Dynamic Growth System**: Eat pellets to grow (growth proportional to pellet size)
- **Responsive Camera**: Follows your snake smoothly with easing

## Tech Stack

- **TypeScript** - Type-safe code for both client and server
- **Node.js + ws** - WebSocket server for real-time communication
- **Vite** - Fast client-side development and building
- **Canvas 2D** - High-performance rendering

## Project Structure

```
/server          # Authoritative game server
  /src
    index.ts     # WebSocket server
    GameServer.ts # Main game loop
    Snake.ts     # Snake entity
    Pellet.ts    # Pellet management
    CollisionDetection.ts
    Leaderboard.ts

/client          # Browser-based frontend
  /src
    main.ts      # Entry point
    Game.ts      # Client game state
    Renderer.ts  # Canvas rendering
    Camera.ts    # Camera system
    InputHandler.ts # Mouse input
    UI.ts        # UI management

/shared          # Shared types and protocol
  constants.ts   # Game constants
  types.ts       # Entity types
  protocol.ts    # WebSocket messages
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:

```bash
pnpm install
```

This will install dependencies for the root workspace and all sub-packages (server, client, shared).

### Running the Game

#### Option 1: Run both server and client together

```bash
pnpm run dev
```

#### Option 2: Run separately

Terminal 1 (Server):
```bash
pnpm run server
# or
cd server && pnpm run dev
```

Terminal 2 (Client):
```bash
pnpm run client
# or
cd client && pnpm run dev
```

### Access the Game

1. Open your browser to `http://localhost:3000`
2. Enter your name and click "Play"
3. Use your mouse to control your snake
4. Eat pellets to grow
5. Avoid hitting other snakes!

### Testing Multiplayer

Open multiple browser tabs or windows to `http://localhost:3000` to test multiplayer functionality.

## Game Configuration

Edit `/shared/constants.ts` to adjust game parameters:

- `WORLD_WIDTH` / `WORLD_HEIGHT` - Game world size
- `TICK_RATE` - Server update frequency (20 TPS)
- `SNAKE_BASE_SPEED` - Movement speed
- `PELLET_COUNT` - Number of pellets in the world
- `LEADERBOARD_SIZE` - Number of top players shown

## Server Configuration

The WebSocket server runs on port 8080 by default. To change:

```bash
PORT=9000 npm run server
```

## Building for Production

### Server

```bash
cd server
pnpm run build
pnpm start
```

### Client

```bash
cd client
pnpm run build
pnpm run preview
```

The built client files will be in `client/dist/`.

## Game Mechanics

- **Movement**: Snake moves continuously forward, mouse controls rotation (ultra-smooth)
- **Growth**: Each pellet eaten adds segments (2-4 segments based on pellet size)
- **Death**: Colliding with another snake's body kills you
- **Respawn**: Click "Play Again" to respawn with a new snake
- **Score**: Based on snake length

## Network Protocol

### Client → Server

- `JOIN` - Join game with a name
- `INPUT` - Send desired rotation angle
- `PING` - Latency measurement

### Server → Client

- `STATE` - Full game state snapshot (20 times per second)
- `DEAD` - Notification of death
- `PONG` - Latency response

## Performance

- Server: 20 TPS (ticks per second)
- Client: 60 FPS rendering with advanced interpolation (jerkiness-free)
- Smooth camera easing for professional feel
- Supports 10-20+ concurrent players smoothly

## Future Enhancements (Not Yet Implemented)

- Web3 integration (blockchain, wallets)
- Oasis ROFL deployment
- Pyth randomness
- Mobile touch controls
- Audio/sound effects
- Multiple game rooms
- Power-ups
- Snake skins/customization

## Troubleshooting

**Connection Issues:**
- Ensure the server is running on port 8080
- Check browser console for WebSocket errors
- Firewall may be blocking the WebSocket connection

**Performance Issues:**
- Try reducing `PELLET_COUNT` in constants
- Close other browser tabs
- Check CPU usage

## License

MIT
