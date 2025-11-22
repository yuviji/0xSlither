import { ethers } from "hardhat";

async function main() {
  const stakeArenaAddress = process.env.STAKE_ARENA_ADDRESS;
  const serverAddress = process.env.SERVER_ADDRESS;

  if (!stakeArenaAddress || !serverAddress) {
    console.error("Please set STAKE_ARENA_ADDRESS and SERVER_ADDRESS in .env");
    process.exit(1);
  }

  console.log("Updating authorized server...");
  console.log("StakeArena:", stakeArenaAddress);
  console.log("New Server:", serverAddress);

  const StakeArena = await ethers.getContractAt("StakeArena", stakeArenaAddress);
  const tx = await StakeArena.updateAuthorizedServer(serverAddress);
  console.log("Transaction submitted:", tx.hash);
  
  await tx.wait();
  console.log("✅ Authorized server updated successfully!");

  // Verify
  const currentServer = await StakeArena.authorizedServer();
  console.log("Current authorized server:", currentServer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

