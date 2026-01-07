import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying 0xSlither unified contract to Base...");
  console.log("Using native ETH for game economy\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get network to determine correct Pyth Entropy address
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Load chain IDs from env
  const BASE_CHAIN_ID = Number(process.env.BASE_CHAIN_ID);
  const BASE_SEPOLIA_CHAIN_ID = Number(process.env.BASE_SEPOLIA_CHAIN_ID);
  
  if (!BASE_CHAIN_ID || !BASE_SEPOLIA_CHAIN_ID) {
    throw new Error('BASE_CHAIN_ID and BASE_SEPOLIA_CHAIN_ID must be set in .env');
  }
  
  // Pyth Entropy V2 addresses from env
  // Source: https://docs.pyth.network/entropy/chainlist
  const PYTH_ENTROPY_ADDRESSES: { [key: number]: string } = {
    [BASE_CHAIN_ID]: process.env.BASE_PYTH_ENTROPY_ADDRESS!,
    [BASE_SEPOLIA_CHAIN_ID]: process.env.BASE_SEPOLIA_PYTH_ENTROPY_ADDRESS!,
  };
  
  const PYTH_ENTROPY_ADDRESS = PYTH_ENTROPY_ADDRESSES[chainId];
  
  if (!PYTH_ENTROPY_ADDRESS) {
    throw new Error(`Pyth Entropy address not configured for chain ID ${chainId}. Set BASE_PYTH_ENTROPY_ADDRESS or BASE_SEPOLIA_PYTH_ENTROPY_ADDRESS in .env`);
  }
  
  // Network-specific configuration from env
  const networkConfig = {
    [BASE_CHAIN_ID]: {
      name: "Base Mainnet",
      rpcUrl: process.env.BASE_RPC_URL!,
      explorerUrl: process.env.BASE_EXPLORER_URL!,
    },
    [BASE_SEPOLIA_CHAIN_ID]: {
      name: "Base Sepolia",
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL!,
      explorerUrl: process.env.BASE_SEPOLIA_EXPLORER_URL!,
    },
  };
  
  const config = networkConfig[chainId as keyof typeof networkConfig];
  
  if (!config) {
    throw new Error(`Network configuration not found for chain ID ${chainId}`);
  }
  
  console.log(`\n📍 Pyth Entropy V2 address: ${PYTH_ENTROPY_ADDRESS}`);
  console.log(`🌐 Network: ${config.name} (Chain ID: ${chainId})\n`);

  // Deploy unified StakeArena with Pyth Entropy integration
  console.log("1. Deploying unified StakeArena...");
  const StakeArena = await ethers.getContractFactory("StakeArena");
  const stakeArena = await StakeArena.deploy(deployer.address, PYTH_ENTROPY_ADDRESS);
  await stakeArena.waitForDeployment();
  const stakeArenaAddress = await stakeArena.getAddress();
  console.log("✅ StakeArena deployed to:", stakeArenaAddress);

  // Verify deployment (wait a moment for indexing)
  console.log("\n2. Verifying deployment...");
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  
  try {
    const authorizedServer = await stakeArena.authorizedServer();
    console.log(`✅ Authorized server: ${authorizedServer}`);
    
    const entropyAddress = await stakeArena.entropy();
    console.log(`✅ Pyth Entropy: ${entropyAddress}`);
  } catch (error) {
    console.log("⚠️  Contract deployed but verification failed (this is normal immediately after deployment)");
    console.log("   You can verify manually on BaseScan shortly");
  }

  // Save deployment addresses
  console.log("\n3. Deployment Summary:");
  console.log("=======================");
  console.log(`StakeArena (Unified): ${stakeArenaAddress}`);
  console.log(`Pyth Entropy V2: ${PYTH_ENTROPY_ADDRESS}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Token: Native ETH`);
  
  console.log("\n4. Save these to your .env files:");
  console.log("─".repeat(60));
  console.log(`BASE_RPC_URL=${config.rpcUrl}`);
  console.log(`BASE_CHAIN_ID=${chainId}`);
  
  // Output the appropriate environment variable name based on network
  if (chainId === BASE_CHAIN_ID) {
    console.log(`BASE_STAKE_ARENA_ADDRESS=${stakeArenaAddress}`);
  } else {
    // Must be Base Sepolia (already validated above)
    console.log(`BASE_SEPOLIA_STAKE_ARENA_ADDRESS=${stakeArenaAddress}`);
  }
  console.log(`PYTH_ENTROPY_ADDRESS=${PYTH_ENTROPY_ADDRESS}`);
  console.log("─".repeat(60));
  
  const networkFlag = chainId === BASE_CHAIN_ID ? "base" : "baseSepolia";
  
  console.log("\n5. Next Steps:");
  console.log("   • Update server .env with the address above (BASE_STAKE_ARENA_ADDRESS or BASE_SEPOLIA_STAKE_ARENA_ADDRESS)");
  console.log("   • Update authorizedServer by calling:");
  console.log("     stakeArena.updateAuthorizedServer(<your-server-address>)");
  console.log(`   • Fund server wallet with ${chainId === BASE_CHAIN_ID ? 'ETH' : 'Sepolia ETH'} for entropy requests`);
  console.log(`   • Verify contract on ${config.name}:`);
  console.log(`     npx hardhat verify --network ${networkFlag} ${stakeArenaAddress} ${deployer.address} ${PYTH_ENTROPY_ADDRESS}`);
  
  console.log(`\n🔗 View on Explorer:`);
  console.log(`${config.explorerUrl}/address/${stakeArenaAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
