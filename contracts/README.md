# 0xSlither Smart Contracts

Smart contracts for the 0xSlither game economy on Saga Chainlet.

## Contracts

### GameToken (ERC20)
- **Symbol**: SLTH
- **Name**: SlitherCoin
- **Decimals**: 18
- Standard ERC20 with minting capability

### StakeArena
Main game contract handling:
- **Stake-to-Enter**: Players must stake tokens to join matches
- **Loot-on-Eat**: Winners receive 100% of eaten players' stakes
- **Tap-Out**: Players can voluntarily exit and withdraw their stake
- **Match Finalization**: Server finalizes matches and updates leaderboards
- **On-Chain Leaderboard**: Top 10 players by best score
- **Entropy Commitment**: Placeholder for Pyth Entropy integration

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your private key
```

3. Compile contracts:
```bash
pnpm run compile
```

4. Deploy to Saga Chainlet:
```bash
pnpm run deploy
```

## Saga Chainlet Details

- **RPC**: https://slither-2763767854157000-1.jsonrpc.sagarpc.io
- **Explorer**: https://slither-2763767854157000-1.sagaexplorer.io
- **Chain ID**: 2763767854157000

## Post-Deployment

After deploying:

1. Save the contract addresses in `.env`
2. Update the authorized server address:
```bash
npx hardhat run scripts/updateServer.ts --network saga
```
3. Mint tokens for testing
4. Configure server with contract addresses

## Contract Functions

### Player Functions
- `enterMatch(matchId, amount)` - Stake tokens to enter
- `tapOut(matchId)` - Exit match and withdraw stake

### Server Functions (requires authorization)
- `reportEat(matchId, eater, eaten)` - Transfer loot from eaten to eater
- `commitEntropy(matchId, entropyId)` - Commit entropy seed
- `finalizeMatch(matchId, players, scores, winner)` - Finalize match

### View Functions
- `getLeaderboard()` - Get top 10 players
- `bestScore(player)` - Get player's best score
- `getStake(matchId, player)` - Get player's current stake in match
- `isActive(matchId, player)` - Check if player is active in match
- `getMatchSummary(matchId)` - Get match details

## Events

- `Entered(matchId, player, amount)`
- `EatLoot(matchId, eater, eaten, amountTransferred, timestamp)`
- `TappedOut(matchId, player, amountWithdrawn)`
- `EntropyCommitted(matchId, entropyRequestId)`
- `MatchFinalized(matchId, winner, timestamp)`
- `BestScoreUpdated(player, newScore)`

## Future Extensions

The contracts are designed to support future upgrades:
- NFT cosmetic skins (ERC721)
- Saga Dollar prize pools
- MatchManager lifecycle contract
- Pyth Entropy randomness
- ROFL enclave verification

