# 🎮 0xSlither

A real-time multiplayer snake game with a complete on-chain economy powered by blockchain technology.

[![Play Now](https://img.shields.io/badge/🎮_Play_Now-0xslither.vercel.app-success?style=for-the-badge)](https://0xslither.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**🔴 LIVE NOW**: [https://0xslither.yuvrajlakhotia.me](https://0xslither.yuvrajlakhotia.me)

Connect your MetaMask wallet and deposit ETH to play! The game runs on Base Mainnet with native ETH for staking. Server hosting details and performance optimizations ensure smooth gameplay.

---

## 🌟 What is 0xSlither?

0xSlither is a multiplayer snake game where players stake tokens to enter matches and winners collect the stakes of players they eliminate. Every match uses cryptographically verifiable randomness for fair spawn positions and pellet placement. All game results, stakes, and leaderboards are stored permanently on-chain.

### 🎯 Core Features

#### Gameplay
- **Real-time Multiplayer**: Authoritative 20 TPS server with WebSocket communication
- **Ultra-Smooth Movement**: 60 FPS rendering with advanced interpolation
- **Dynamic Growth System**: Eat pellets to grow (growth proportional to pellet size)
- **Precise Collision Detection**: Snake-to-snake collisions and pellet consumption
- **Responsive Camera**: Smooth camera following with easing

#### Blockchain Economy
- **Stake-to-Enter**: Players stake ETH to join matches (vault model)
- **Winner Takes All**: Collect 100% of eliminated players' stakes instantly
- **Tap-Out Anytime**: Exit safely and withdraw pellet token rewards
- **On-Chain Leaderboard**: Top players tracked permanently on [BaseScan](https://basescan.org)
- **Hybrid Batching**: Instant rewards, batched stats (gas-efficient)
- **Auto Network Config**: MetaMask automatically configured for Base (no manual setup!)

#### Fair Randomness (Pyth Entropy)
- **Cryptographically Secure RNG**: Powered by [Pyth Entropy V2 on Base](https://basescan.org/address/0x6e7d74fa7d5c90fef9f0512987605a6d546181bb)
- **Single-Chain Architecture**: Direct entropy integration on Base (no bridge needed)
- **Deterministic Gameplay**: Single on-chain seed generates all match-critical random values
- **Provable Fairness**: Spawn positions, colors, and pellet layouts derived from verifiable entropy
- **Reproducible Matches**: Same seed + player roster = identical match conditions
- **On-Chain Verification**: Anyone can verify spawn positions were fair using contract view functions

---

## 🚀 Quick Start

### 🎮 Play Online Now

**Visit [0xslither.yuvrajlakhotia.me](https://0xslither.yuvrajlakhotia.me)** and start playing immediately!

1. Open [https://0xslither.yuvrajlakhotia.me](https://0xslither.yuvrajlakhotia.me)
2. Connect your MetaMask wallet (will auto-configure Base network)
3. Enter your name
4. Deposit 0.00005 ETH to vault
5. Start eating and growing!

### 🔧 Run Locally (For Development)

Want to modify the code or run your own instance?

```bash
# Install dependencies
pnpm install

# Start server and client
pnpm run dev
```

Open http://localhost:3000 to play your local version.

---

## 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** package manager ([Install](https://pnpm.io/installation))
- **MetaMask** browser extension (for blockchain features)
- **ETH on Base** (for production) or Base Sepolia ETH (for testing)

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/0xSlither.git
cd 0xSlither
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all workspaces (server, client, shared, contracts).

### 3. Start the Game

```bash
pnpm run dev
```

This starts:
- Game server on **port 8080** (WebSocket)
- Web client on **port 3000** (HTTP)

### 4. Play!

Open http://localhost:3000 in your browser.

---

## 🎮 How to Play

**Live Game**: [0xslither.vercel.app](https://0xslither.vercel.app)

1. **Connect Wallet** (optional - only for staking features)
2. **Enter Your Name**
3. **Deposit ETH to Vault** or click "Play" to play for free
4. **Move Mouse** to control your snake's direction
5. **Eat Pellets** to grow bigger and earn pellet tokens
6. **Avoid Other Snakes** - hitting their body kills you!
7. **Eliminate Others** to instantly collect their stakes (direct ETH transfer)
8. **Tap Out** anytime to safely exit and withdraw pellet token rewards

---

## 🌐 Production Deployment

0xSlither is fully deployed and running in production:

| Component | Platform | URL/Details |
|-----------|----------|-------------|
| **Frontend** | Vercel | [0xslither.vercel.app](https://0xslither.vercel.app) |
| **Game Server** | Real-time WebSocket Server | Authoritative 20 TPS game loop |
| **Smart Contract** | Base Mainnet | [View on BaseScan](https://basescan.org) (update after deployment) |
| **Randomness** | Pyth Entropy V2 | Integrated directly in contract |

### Why Fluence CPU?

Fluence CPU provides decentralized compute infrastructure, ensuring:
- ✅ No single point of failure
- ✅ Censorship resistance
- ✅ Transparent execution
- ✅ Perfect fit for Web3 gaming

---

## ⛓️ Blockchain Architecture

### Multi-Chain Setup

0xSlither uses a unified architecture on Base:

1. **Base Mainnet** (Single-Chain Architecture)
   - L2 chain with low gas costs and high performance
   - Hosts unified `StakeArena` contract with integrated Pyth Entropy
   - Handles staking, leaderboards, randomness, and all game logic
   - Uses native ETH for all transactions

### Key Architecture Improvements

- **No Bridge Required**: Entropy is requested and consumed on same chain
- **Gas Efficient**: Hybrid batching (instant rewards, batched stats)
- **Simpler Deployment**: Single contract instead of multiple
- **Better Wallet Support**: Base is widely supported ecosystem

### Getting ETH

#### Base Mainnet (Production)
- Bridge ETH to Base using [Base Bridge](https://bridge.base.org)
- Or buy directly on Base via exchanges

#### Base Sepolia (Testing)
1. Get Sepolia ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. Bridge to Base Sepolia using [Base Bridge](https://bridge.base.org)

#### Base Mainnet ETH
1. Add Base Mainnet to MetaMask (Chain ID: 8453)
2. Bridge ETH from Ethereum mainnet using [Base Bridge](https://bridge.base.org/)

### Contract Deployment

#### Deploy to Base Mainnet

```bash
cd contracts

# Create .env file
cat > .env << EOF
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
EOF

# Deploy StakeArena contract
pnpm run deploy
```

Copy the deployed `StakeArena` address.

### Server Configuration

Create `server/.env`:

```bash
cd ../server
cat > .env << EOF
# Required
PRIVATE_KEY=0x...                           # Server wallet private key
# Set one or both of these depending on which network(s) you deployed to:
BASE_STAKE_ARENA_ADDRESS=0x...              # StakeArena contract on Base mainnet
BASE_SEPOLIA_STAKE_ARENA_ADDRESS=0x...      # StakeArena contract on Base Sepolia
BASE_RPC_URL=https://mainnet.base.org       # Use https://sepolia.base.org for Sepolia

# Optional (for match finalization)
ENABLE_BLOCKCHAIN=true
EOF
```

### Client Configuration

Create `client/.env`:

```bash
cd ../client
cat > .env << EOF
VITE_BLOCKCHAIN_ENABLED=true
# Set one or both of these depending on which network(s) you want to support:
VITE_BASE_STAKE_ARENA_ADDRESS=0x...         # StakeArena contract on Base mainnet
VITE_BASE_SEPOLIA_STAKE_ARENA_ADDRESS=0x... # StakeArena contract on Base Sepolia
VITE_BASE_RPC_URL=https://mainnet.base.org
VITE_BASE_CHAIN_ID=8453
EOF
```

### Authorize the Server

The server needs permission to finalize matches:

```bash
cd contracts
pnpm run update:server
```

Enter your StakeArena address and server wallet address when prompted.

### Start With Blockchain

```bash
cd ..
pnpm run dev
```

Now when you play:
- Connect your MetaMask wallet
- Stake ETH to enter matches
- Earn stakes from eliminated players
- View your rank on the on-chain leaderboard

---

## 🎲 How Deterministic RNG Works

### Fair Randomness System

The game uses deterministic random number generation for fair gameplay:

```
┌──────────────────────────────────────────────────┐
│  1. Server generates entropy seed on match start │
└────────────────┬─────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
    │  2. Seed is committed to   │
    │     StakeArena (Base)      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
    │  3. Generate using RNG:    │
    │     • Spawn positions      │
    │     • Snake colors         │
    │     • Pellet layout        │
    │     • Map type             │
        └────────────────────────────┘
```

### What Gets Randomized

1. **Player Spawns**: Derived from `keccak256(seed, "spawn", playerAddress, retryCount)`
2. **Snake Colors**: Derived from `keccak256(seed, "color", playerAddress)`
3. **Pellet Field**: All 500 pellets from `keccak256(seed, "pellets")`
4. **Map Layout**: Pattern type from `keccak256(seed, "map")`

### Verification

- **Seed Hash**: `StakeArena.entropySeedByMatch[matchId]` on Base
- **Fair Match Badge**: ✓ Shown in-game with match ID and entropy details

---

## 📁 Project Structure

```
0xSlither/
├── client/                 # Frontend (Vite + TypeScript)
│   └── src/
│       ├── main.ts         # Entry point
│       ├── Game.ts         # Game state management
│       ├── Renderer.ts     # Canvas rendering (60 FPS)
│       ├── Camera.ts       # Smooth camera system
│       ├── InputHandler.ts # Mouse controls
│       ├── WalletService.ts# Web3 wallet integration
│       └── UI.ts           # UI components
│
├── server/                 # Backend (Node.js + TypeScript)
│   └── src/
│       ├── index.ts        # WebSocket server
│       ├── GameServer.ts   # Main game loop (20 TPS)
│       ├── Snake.ts        # Snake entity
│       ├── Pellet.ts       # Pellet management
│       ├── CollisionDetection.ts # Physics
│       ├── BlockchainService.ts  # Base Web3
│       ├── DeterministicRNG.ts   # Seeded RNG
│       └── Leaderboard.ts  # Rankings
│
├── contracts/              # Smart contracts (Solidity)
│   ├── contracts/
│   │   └── StakeArena.sol      # Main game (Base)
│   └── scripts/
│       ├── deployStakeArena.ts # Deploy to Base
│       ├── updateServer.ts     # Authorize server
│       └── getLeaderboard.ts   # Query rankings
│
└── shared/                 # Shared TypeScript types
    ├── constants.ts        # Game configuration
    ├── types.ts            # Entity definitions
    └── protocol.ts         # Network messages
```

---

## 🔧 Development

### Run Separately

```bash
# Terminal 1 - Server
pnpm run server

# Terminal 2 - Client
pnpm run client
```

### Build for Production

```bash
# Build server
cd server && pnpm run build
pnpm start

# Build client
cd client && pnpm run build
pnpm run preview
```

### Test Multiplayer

Open multiple browser tabs to [0xslither.vercel.app](https://0xslither.vercel.app) - each tab is a separate player!

For local testing, use http://localhost:3000 instead.

### Network Configuration (Base vs Base Sepolia)

The game uses a **single network toggle** as the source of truth. To switch between Base mainnet and Base Sepolia:

1. Open `client/src/networkConfig.ts`
2. Find the `USE_BASE_MAINNET` constant at the top
3. Set it to `true` for Base mainnet or `false` for Base Sepolia

```typescript
// ============================================================================
// NETWORK TOGGLE - Change this to switch between Base Mainnet and Base Sepolia
// This is the single source of truth for which network the game uses
// ============================================================================
const USE_BASE_MAINNET = true; // Set to false to use Base Sepolia
```

**Important:** 
- This toggle determines which contract address is used (from your `.env` file)
- The wallet will automatically switch users to the correct network
- Users on the wrong network will be prompted to switch
- Set the corresponding environment variable:
  - Base mainnet: `VITE_BASE_STAKE_ARENA_ADDRESS`
  - Base Sepolia: `VITE_BASE_SEPOLIA_STAKE_ARENA_ADDRESS`

### Configuration

Edit `shared/constants.ts`:

```typescript
export const WORLD_WIDTH = 5000;          // Game world width
export const WORLD_HEIGHT = 5000;         // Game world height
export const TICK_RATE = 20;              // Server updates/sec
export const SNAKE_BASE_SPEED = 100;      // Snake speed
export const PELLET_COUNT = 500;          // Number of pellets
export const LEADERBOARD_SIZE = 5;        // Top players shown
```

### Change Server Port

```bash
PORT=9000 pnpm run server
```

---

## 🛠️ Tech Stack

### Frontend
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Vercel** - Production hosting
- **Canvas 2D** - High-performance rendering
- **ethers.js v6** - Blockchain interactions

### Backend
- **Node.js** - Server runtime
- **Fluence CPU** - Decentralized compute hosting
- **ws** - WebSocket library
- **ethers.js v6** - Blockchain interactions

### Blockchain
- **Base Mainnet** - Ethereum L2 for game economy
- **Solidity 0.8.20** - Smart contracts
- **Hardhat** - Development framework
- **OpenZeppelin** - Secure contract libraries
- **Deterministic RNG** - Fair randomness generation

---

## 🎯 Roadmap

### ✅ Completed
- [x] Real-time multiplayer gameplay
- [x] On-chain staking economy (Base Mainnet)
- [x] Deterministic RNG for fair randomness
- [x] Match replay capability
- [x] Leaderboard system
- [x] Smooth camera and interpolation
- [x] **Production deployment on Vercel**
- [x] **Decentralized server on Fluence CPU**

### 🚧 Future Enhancements
- [ ] Mobile touch controls
- [ ] Audio and sound effects
- [ ] Multiple game rooms
- [ ] Power-ups
- [ ] Snake skins/NFT customization
- [ ] Tournament mode with brackets
- [ ] Achievement system

---

## 🐛 Troubleshooting

### Connection Issues
- ✅ Ensure server is running on port 8080
- ✅ Check browser console (F12) for WebSocket errors
- ✅ Verify firewall isn't blocking connections
- ✅ Try `ws://localhost:8080` instead of `wss://`

### Blockchain Issues
- ✅ Ensure MetaMask is installed and unlocked
- ✅ Verify you're on Base Mainnet network
- ✅ Check you have enough ETH for transactions
- ✅ Look for transaction errors in MetaMask
- ✅ View contract on [Basescan](https://basescan.org/)

### Performance Issues
- ✅ Reduce `PELLET_COUNT` in `shared/constants.ts`
- ✅ Close other browser tabs
- ✅ Check CPU usage (should be <50%)
- ✅ Try a different browser (Chrome recommended)

### Game Not Starting
1. Check that both servers are running
2. Verify `pnpm install` completed successfully
3. Clear browser cache and reload
4. Check for errors in terminal and browser console

---

## 📚 Documentation

- **Project Overview**: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- **Smart Contracts**: See `contracts/README.md`
- **Network Protocol**: See "Network Protocol" section below

---

## 📡 Network Protocol

### Client → Server

```typescript
{ type: 'JOIN', name: string, address?: string, stakeAmount?: string }
{ type: 'INPUT', angle: number }
{ type: 'PING', timestamp: number }
{ type: 'TAPOUT' }
```

### Server → Client

```typescript
{ type: 'STATE', snakes: Snake[], pellets: Pellet[], leaderboard: Player[] }
{ type: 'DEAD', score: number, rank: number }
{ type: 'PONG', timestamp: number }
```

---

## 🎮 Game Mechanics

- **Movement**: Snake moves forward continuously, mouse controls rotation
- **Growth**: Pellets add 2-4 segments based on size
- **Death**: Hitting another snake's body eliminates you
- **Stakes**: Winner collects all stakes from eliminated players
- **Respawn**: Click "Play Again" to rejoin with new stake
- **Score**: Based on total snake length
- **Leaderboard**: Top 5 players by score

---

## 📊 Performance

- **Server**: 20 TPS (authoritative game loop)
- **Client**: 60 FPS rendering with interpolation
- **Players**: Supports 10-20+ concurrent players
- **Latency**: <50ms typical (local), <200ms acceptable
- **World**: 5000×5000 units with 500 pellets

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **ETHGlobal** - For the hackathon opportunity
- **Base** - For the fast and affordable L2 infrastructure
- **Fluence** - For decentralized compute hosting
- **Vercel** - For frontend hosting
- **OpenZeppelin** - For secure contract libraries
- **Slither.io** - Original game inspiration

---

## 📞 Support & Links

- **🎮 Play Game**: [0xslither.vercel.app](https://0xslither.vercel.app)
- **Issues**: [GitHub Issues](https://github.com/yourusername/0xSlither/issues)
- **Base Explorer**: [View Transactions on Basescan](https://basescan.org/)

---

<div align="center">

**Built with ❤️ using TypeScript, Fluence CPU, and Blockchain**

**Deployed on Vercel | Server on Fluence CPU | Contracts on Base**

**[🎮 Play Now](https://0xslither.vercel.app)** | **[Report Bug](https://github.com/yourusername/0xSlither/issues)** | **[Request Feature](https://github.com/yourusername/0xSlither/issues)**

</div>
