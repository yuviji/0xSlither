import { ethers } from "hardhat";

async function main() {
  console.log("Deploying 0xSlither contracts to Saga Chainlet...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "SSS");

  // Deploy GameToken
  console.log("\n1. Deploying GameToken...");
  const GameToken = await ethers.getContractFactory("GameToken");
  const initialSupply = ethers.parseEther("1000000"); // 1 million tokens
  const gameToken = await GameToken.deploy(initialSupply);
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  console.log("GameToken deployed to:", gameTokenAddress);

  // Deploy StakeArena
  console.log("\n2. Deploying StakeArena...");
  const StakeArena = await ethers.getContractFactory("StakeArena");
  const stakeArena = await StakeArena.deploy(gameTokenAddress, deployer.address);
  await stakeArena.waitForDeployment();
  const stakeArenaAddress = await stakeArena.getAddress();
  console.log("StakeArena deployed to:", stakeArenaAddress);

  // Verify deployment
  console.log("\n3. Verifying deployment...");
  const tokenName = await gameToken.name();
  const tokenSymbol = await gameToken.symbol();
  const totalSupply = await gameToken.totalSupply();
  console.log(`GameToken: ${tokenName} (${tokenSymbol})`);
  console.log(`Total Supply: ${ethers.formatEther(totalSupply)} tokens`);
  
  const authorizedServer = await stakeArena.authorizedServer();
  console.log(`StakeArena authorized server: ${authorizedServer}`);

  // Save deployment addresses
  console.log("\n4. Deployment Summary:");
  console.log("=======================");
  console.log(`GameToken: ${gameTokenAddress}`);
  console.log(`StakeArena: ${stakeArenaAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("\nSave these addresses in your .env file:");
  console.log(`GAME_TOKEN_ADDRESS=${gameTokenAddress}`);
  console.log(`STAKE_ARENA_ADDRESS=${stakeArenaAddress}`);
  console.log("\nUpdate authorizedServer by calling:");
  console.log("stakeArena.updateAuthorizedServer(<your-server-address>)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

