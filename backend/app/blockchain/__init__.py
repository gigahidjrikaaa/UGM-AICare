"""
Multi-Chain Blockchain Module

UGM-AICare integrates with multiple blockchains:

1. SOMNIA Mainnet (Chain ID: 5031)
   - CARE Token (ERC20) - Platform utility token
   - PlatformRevenueOracle - Monthly revenue reporting with multi-sig
   - CareStakingHalal - Mudarabah-compliant profit-sharing staking

2. EDU Chain Testnet
   - UGMJournalBadges (ERC1155) - Achievement NFT badges

Each blockchain is organized in its own subdirectory for clarity.
"""

from app.blockchain.base_web3 import BaseWeb3Client

# SOMNIA contracts
from app.blockchain.somnia import (
    CareTokenClient,
    OracleClient,
    StakingClient,
)

# EDU Chain contracts
from app.blockchain.edu_chain import (
    init_blockchain as init_nft_client,
    mint_nft_badge,
    w3 as edu_w3,
    contract as nft_contract,
)

__all__ = [
    # Base
    "BaseWeb3Client",
    
    # SOMNIA
    "CareTokenClient",
    "OracleClient",
    "StakingClient",
    
    # EDU Chain
    "init_nft_client",
    "mint_nft_badge",
    "edu_w3",
    "nft_contract",
]
