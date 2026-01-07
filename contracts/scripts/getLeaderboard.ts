import { ethers } from "hardhat";

async function main() {
  // Support both Base mainnet and Base Sepolia
  const baseStakeArenaAddress = process.env.BASE_STAKE_ARENA_ADDRESS;
  const baseSepoliaStakeArenaAddress = process.env.BASE_SEPOLIA_STAKE_ARENA_ADDRESS;
  const stakeArenaAddress = baseStakeArenaAddress || baseSepoliaStakeArenaAddress;
  
  if (!stakeArenaAddress) {
    console.error("Please set BASE_STAKE_ARENA_ADDRESS or BASE_SEPOLIA_STAKE_ARENA_ADDRESS in .env");
    process.exit(1);
  }

  const networkName = baseStakeArenaAddress ? 'Base' : 'Base Sepolia';
  console.log(`Fetching on-chain leaderboard from ${networkName}...`);
  console.log("StakeArena:", stakeArenaAddress);

  const StakeArena = await ethers.getContractAt("StakeArena", stakeArenaAddress);
  const leaderboard = await StakeArena.getLeaderboard();

  console.log("\n📊 On-Chain Leaderboard:");
  console.log("========================");
  
  if (leaderboard.length === 0) {
    console.log("No entries yet");
  } else {
    leaderboard.forEach((entry: any, index: number) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
      console.log(`${medal} ${index + 1}. ${entry.player} - Score: ${entry.score}`);
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

