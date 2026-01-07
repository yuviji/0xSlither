import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    base: {
      url: process.env.BASE_RPC_URL as string,
      accounts: [process.env.PRIVATE_KEY as string],
      chainId: Number(process.env.BASE_CHAIN_ID),
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL as string,
      accounts: [process.env.PRIVATE_KEY as string],
      chainId: Number(process.env.BASE_SEPOLIA_CHAIN_ID),
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY,
  },
  sourcify: {
    enabled: false
  },
};

export default config;
