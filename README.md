# 🎮 0xSlither

Multiplayer snake game with on-chain staking on Base Mainnet. Eat pellets, eliminate players, collect their stakes.

**🔴 [PLAY NOW](https://0xslither.yuvrajlakhotia.me)**

---

## Features

- **Real-time Multiplayer**: 20 TPS server, 60 FPS rendering
- **Stake & Earn**: Deposit ETH, eliminate players, collect stakes instantly
- **Fair RNG**: Pyth Entropy V2 for verifiable spawn positions & pellet placement
- **On-Chain Leaderboard**: Permanent rankings on Base

---

## Quick Start

### Play Online
1. Visit [0xslither.yuvrajlakhotia.me](https://0xslither.yuvrajlakhotia.me)
2. Connect MetaMask (auto-configures Base)
3. Deposit 0.00005 ETH
4. Play!

### Run Locally
```bash
pnpm install
pnpm run dev
```
Open http://localhost:3000

---

## Project Structure

```
client/          # Frontend (Vite + TypeScript)
server/          # Game server (Node.js + WebSocket)
contracts/       # Smart contracts (Solidity)
shared/          # Shared types & constants
```

---

## Deployment

### 1. Deploy Contract
```bash
cd contracts
echo "BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=your_key
BASESCAN_API_KEY=your_key" > .env
pnpm run deploy
```

### 2. Configure Server
```bash
cd ../server
echo "PRIVATE_KEY=0x...
BASE_STAKE_ARENA_ADDRESS=0x...
BASE_RPC_URL=https://mainnet.base.org
ENABLE_BLOCKCHAIN=true" > .env
```

### 3. Configure Client
```bash
cd ../client
echo "VITE_BLOCKCHAIN_ENABLED=true
VITE_BASE_STAKE_ARENA_ADDRESS=0x...
VITE_BASE_RPC_URL=https://mainnet.base.org
VITE_BASE_CHAIN_ID=8453" > .env
```

### 4. Authorize Server
```bash
cd ../contracts
pnpm run update:server
```

---

## Tech Stack

- **Frontend**: TypeScript, Vite, Canvas 2D, ethers.js
- **Backend**: Node.js, WebSocket
- **Blockchain**: Base (Ethereum L2), Solidity, Hardhat, Pyth Entropy

---

## Network Toggle

To switch between Base Mainnet and Sepolia, edit `client/src/networkConfig.ts`:

```typescript
const USE_BASE_MAINNET = true; // false for Sepolia
```

---

## License

MIT