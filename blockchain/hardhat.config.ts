// blockchain/hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config"; // Import dotenv config

// Ensure environment variables are loaded
const eduTestnetRpcUrl = process.env.EDU_TESTNET_RPC_URL;
const privateKey = process.env.TESTNET_PRIVATE_KEY;

if (!eduTestnetRpcUrl) {
  console.warn("EDU_TESTNET_RPC_URL environment variable not set.");
}
if (!privateKey) {
  console.warn("TESTNET_PRIVATE_KEY environment variable not set. Deployments will fail.");
}

const config: HardhatUserConfig = {
  solidity: "0.8.28", // Match your contract's pragma
  networks: {
    hardhat: {
      // Local development network configuration (optional)
    },
    eduTestnet: { // Network configuration for EDUChain Testnet
      url: eduTestnetRpcUrl || "", // Get URL from .env
      chainId: 656476, // <<< REPLACE 11155420 with the ACTUAL EDUChain Testnet Chain ID! Found ChainID from ChainList URL provided
      accounts: privateKey ? [`0x${privateKey}`] : [], // Use private key from .env
    },
    // Add other networks like EDUChain Mainnet later
  },
  // Optional: Add Etherscan verification config later
  // etherscan: { apiKey: process.env.ETHERSCAN_API_KEY }
};

export default config;