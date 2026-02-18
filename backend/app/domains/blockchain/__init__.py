"""
Blockchain Domain Module

Multi-Chain Architecture:
- SOMNIA Mainnet: CARE token, revenue oracle, staking contracts
- EDU Chain Testnet: NFT achievement badges (ERC-1155)
- BNB Smart Chain: NFT achievement badges (ERC-1155) -- added for multi-chain

This module handles all blockchain interactions for the UGM-AICare platform:
- CARE token operations (minting, transfers, balances)
- PlatformRevenueOracle interactions (revenue reporting)
- CareStakingHalal interactions (staking operations)
- Multi-chain NFT badge minting for achievements (via NFTClientFactory)
- Web3 utilities and base client
- Blockchain API routes

Contains:
- base_web3.py: Shared Web3 utilities and connection management
- care_token_client.py: CareToken smart contract client (SOMNIA)
- oracle_client.py: PlatformRevenueOracle smart contract client (SOMNIA)
- staking_client.py: CareStakingHalal smart contract client (SOMNIA)
- nft/: Multi-chain NFT client (chain_registry, base_nft_client, factory)
- edu_chain/: Legacy EDU Chain NFT contracts (deprecated, use nft/ instead)
- routes.py: FastAPI routes for blockchain operations
"""

from app.domains.blockchain.base_web3 import BaseWeb3Client
from app.domains.blockchain.care_token_client import CareTokenClient
from app.domains.blockchain.oracle_client import OracleClient
from app.domains.blockchain.staking_client import StakingClient
from app.domains.blockchain.routes import router as blockchain_router

# Multi-chain NFT client (preferred for new code)
from app.domains.blockchain.nft import (
    NFTClientFactory,
    SUPPORTED_CHAINS,
    DEFAULT_BADGE_CHAIN_ID,
    get_chain_config,
    get_configured_chains,
)
from app.domains.blockchain.attestation import (
    AttestationClientFactory,
    SUPPORTED_ATTESTATION_CHAINS,
    DEFAULT_ATTESTATION_CHAIN_ID,
    get_attestation_chain_config,
)

# Legacy EDU Chain imports (kept for backward compatibility)
from app.domains.blockchain.edu_chain import (
    init_blockchain as init_nft_client,
    mint_nft_badge,
    w3 as edu_w3,
    contract as nft_contract,
)

__all__ = [
    # Base
    "BaseWeb3Client",

    # SOMNIA contracts
    "CareTokenClient",
    "OracleClient",
    "StakingClient",

    # API routes
    "blockchain_router",

    # Multi-chain NFT (preferred)
    "NFTClientFactory",
    "SUPPORTED_CHAINS",
    "DEFAULT_BADGE_CHAIN_ID",
    "get_chain_config",
    "get_configured_chains",
    "AttestationClientFactory",
    "SUPPORTED_ATTESTATION_CHAINS",
    "DEFAULT_ATTESTATION_CHAIN_ID",
    "get_attestation_chain_config",

    # Legacy EDU Chain (deprecated)
    "init_nft_client",
    "mint_nft_badge",
    "edu_w3",
    "nft_contract",
]
