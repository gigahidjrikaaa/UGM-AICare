// blockchain/hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config"; // Import dotenv config

// Ensure environment variables are loaded
const eduTestnetRpcUrl = process.env.EDU_TESTNET_RPC_URL;
const somniaMainnetRpcUrl = process.env.SOMNIA_MAINNET_RPC_URL;
const somniaTestnetRpcUrl = process.env.SOMNIA_TESTNET_RPC_URL;
const privateKey = process.env.TESTNET_PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_PRIVATE_KEY;

if (!eduTestnetRpcUrl) {
  console.warn("EDU_TESTNET_RPC_URL environment variable not set.");
}
if (!somniaMainnetRpcUrl) {
  console.warn("SOMNIA_MAINNET_RPC_URL environment variable not set.");
}
if (!somniaTestnetRpcUrl) {
  console.warn("SOMNIA_TESTNET_RPC_URL environment variable not set.");
}
if (!privateKey) {
  console.warn("TESTNET_PRIVATE_KEY environment variable not set. Testnet deployments will fail.");
}
if (!mainnetPrivateKey) {
  console.warn("MAINNET_PRIVATE_KEY environment variable not set. Mainnet deployments will fail.");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28", // Match your contract's pragma
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable IR-based compilation for complex contracts
    },
  },
  networks: {
    hardhat: {
      // Local development network configuration (optional)
    },
    eduTestnet: { // Network configuration for EDUChain Testnet
      url: eduTestnetRpcUrl || "", // Get URL from .env
      chainId: 656476, // Chain ID for EDUChain Testnet
      accounts: privateKey ? [`0x${privateKey}`] : [], // Use private key from .env
    },
    somniaMainnet: { // Network configuration for SOMNIA Mainnet
      url: somniaMainnetRpcUrl || "https://api.infra.mainnet.somnia.network/", 
      chainId: 5031, // Chain ID for SOMNIA Mainnet
      accounts: mainnetPrivateKey ? [`0x${mainnetPrivateKey}`] : [],
      gasPrice: "auto",
    },
    somniaTestnet: { // Network configuration for SOMNIA Testnet (Shannon)
      url: somniaTestnetRpcUrl || "https://dream-rpc.somnia.network/",
      chainId: 50312, // Chain ID for SOMNIA Testnet
      accounts: privateKey ? [`0x${privateKey}`] : [],
      gasPrice: "auto",
    },
    // Add other networks like EDUChain Mainnet later
  },
  // Optional: Add Etherscan verification config later
  // Note: SOMNIA uses its own explorer, verification may require custom setup
  // etherscan: { 
  //   apiKey: {
  //     somniaMainnet: process.env.SOMNIA_EXPLORER_API_KEY || "",
  //     somniaTestnet: process.env.SOMNIA_EXPLORER_API_KEY || "",
  //   },
  //   customChains: [
  //     {
  //       network: "somniaMainnet",
  //       chainId: 5031,
  //       urls: {
  //         apiURL: "https://explorer.somnia.network/api",
  //         browserURL: "https://explorer.somnia.network"
  //       }
  //     },
  //     {
  //       network: "somniaTestnet",
  //       chainId: 50312,
  //       urls: {
  //         apiURL: "https://shannon-explorer.somnia.network/api",
  //         browserURL: "https://shannon-explorer.somnia.network"
  //       }
  //     }
  //   ]
  // }
};

export default config;