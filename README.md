# 🎮 0xSlither

A real-time multiplayer Slither.io-style game with a complete on-chain economy powered by Saga Chainlet.

**Built for ETHGlobal Buenos Aires 2025** 🇦🇷

## ✨ Features

### 🎯 Core Gameplay
- **Real-time Multiplayer**: Authoritative 20 TPS server with WebSocket communication
- **Ultra-Smooth Movement**: Advanced client-side interpolation for jerkiness-free 60 FPS visuals
- **Collision Detection**: Precise snake-to-snake collisions and pellet consumption
- **Dynamic Growth System**: Eat pellets to grow (growth proportional to pellet size)
- **Responsive Camera**: Follows your snake smoothly with easing

### ⛓️ Blockchain Economy (NEW!)
- **Stake-to-Enter**: Players stake SSS tokens to join matches
- **Loot-on-Eat**: Winners receive 100% of eaten players' stakes on-chain
- **Tap-Out Anytime**: Exit and withdraw your current stake
- **On-Chain Leaderboard**: Top 10 players tracked permanently
- **Match Finalization**: Results stored on Saga Chainlet
- **Best Score Tracking**: Forever preserved on-chain
- **Entropy Commitment**: Placeholder for Pyth Entropy integration
- **Auto Network Config**: Automatic MetaMask network setup (no manual configuration needed!) 🔥

## 🛠️ Tech Stack

### Game Engine
- **TypeScript** - Type-safe code for both client and server
- **Node.js + ws** - WebSocket server for real-time communication
- **Vite** - Fast client-side development and building
- **Canvas 2D** - High-performance rendering

### Blockchain
- **Saga Chainlet** - Dedicated EVM L1 with recycled gas
- **Solidity 0.8.20** - Smart contracts
- **Hardhat** - Development and deployment
- **ethers.js v6** - Blockchain integration
- **OpenZeppelin** - Secure contract libraries

## 📁 Project Structure

```
/server          # Authoritative game server (20 TPS)
  /src
    index.ts                # WebSocket server
    GameServer.ts           # Main game loop & kill detection
    Snake.ts                # Snake entity with wallet address
    BlockchainService.ts    # Web3 integration (NEW!)
    Pellet.ts               # Pellet management
    CollisionDetection.ts   # Physics
    Leaderboard.ts          # In-memory rankings

/client          # Browser-based frontend (60 FPS)
  /src
    main.ts         # Entry point
    Game.ts         # Client game state
    WalletService.ts # Wallet connection & staking (NEW!)
    Renderer.ts     # Canvas rendering
    Camera.ts       # Camera system
    InputHandler.ts # Mouse input
    UI.ts           # UI management

/contracts       # Smart contracts (NEW!)
  /contracts
    StakeArena.sol     # Main game contract (uses native SSS)
  /scripts
    deploy.ts          # Deployment script
    updateServer.ts    # Authorize server
    checkBalance.ts    # Check SSS balance
    getLeaderboard.ts  # Query on-chain data

/shared          # Shared types and protocol
  constants.ts   # Game constants
  types.ts       # Entity types
  protocol.ts    # WebSocket messages (includes TAPOUT)
```

## 🚀 Getting Started

### Quick Start (No Blockchain)

Play the game immediately without blockchain features:

```bash
# Install dependencies
pnpm install

# Start both server and client
pnpm run dev
```

Open http://localhost:3000 and play!

### 🔗 Blockchain Setup

To enable the full on-chain economy:

1. **Quick Setup** (5 minutes): See [QUICKSTART_BLOCKCHAIN.md](QUICKSTART_BLOCKCHAIN.md)
2. **Full Guide**: See [BLOCKCHAIN_SETUP.md](BLOCKCHAIN_SETUP.md)

**TL;DR:**
```bash
# 1. Deploy contracts
cd contracts && pnpm run deploy

# 2. Configure server
cd ../server
cat > .env << EOF
BLOCKCHAIN_ENABLED=true
SERVER_PRIVATE_KEY=0x...
STAKE_ARENA_ADDRESS=0x...
EOF

# 3. Configure client
cd ../client
cat > .env << EOF
VITE_BLOCKCHAIN_ENABLED=true
VITE_STAKE_ARENA_ADDRESS=0x...
EOF

# 4. Start everything
cd .. && pnpm run dev
```

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
2. **Connect your wallet** - MetaMask will automatically be configured with the Saga Chainlet network! (See [NETWORK_SETUP_GUIDE.md](NETWORK_SETUP_GUIDE.md))
3. Enter your name and stake SSS tokens
4. Use your mouse to control your snake
5. Eat pellets to grow and steal other players' stakes!
6. Avoid hitting other snakes!

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
