"""
Blockchain Domain Module

This module handles all blockchain interactions for the UGM-AICare platform:
- CARE token operations (minting, transfers, balances)
- PlatformRevenueOracle interactions (revenue reporting)
- CareStakingHalal interactions (staking operations)
- Web3 utilities and base client
- Blockchain API routes

Contains:
- base_web3.py: Shared Web3 utilities and connection management
- care_token_client.py: CareToken smart contract client
- oracle_client.py: PlatformRevenueOracle smart contract client
- staking_client.py: CareStakingHalal smart contract client
- routes.py: FastAPI routes for blockchain operations
"""

from app.domains.blockchain.base_web3 import BaseWeb3Client
from app.domains.blockchain.care_token_client import CareTokenClient
from app.domains.blockchain.oracle_client import OracleClient
from app.domains.blockchain.staking_client import StakingClient
from app.domains.blockchain.routes import router as blockchain_router

__all__ = [
    "BaseWeb3Client",
    "CareTokenClient",
    "OracleClient",
    "StakingClient",
    "blockchain_router",
]
