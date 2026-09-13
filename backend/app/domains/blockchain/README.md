# Blockchain Module Documentation

## Overview

The **blockchain/** module consolidates all smart contract interactions for the
UGM-AICare platform across **multiple blockchains**, providing a clean
separation of concerns from business logic.

## 🌐 Multi-Chain Architecture

UGM-AICare integrates with multiple EVM chains for two purposes:

### 1. Achievement NFT Badges (ERC-1155)

**Networks**: EDU Chain Testnet, BNB Smart Chain (testnet + mainnet), opBNB

**Contract**: `UGMJournalBadges` (ERC-1155) — multi-token NFT for achievement types.

**Use cases**:

- Mint NFT badges when students complete quests, journals, or milestones
- Track user badge collections on-chain (true, verifiable ownership)

### 2. Onchain Attestation Registry

**Networks**: BNB Smart Chain (testnet + mainnet)

**Contract**: `BSCAttestationRegistry` — records every consequential autopilot
action (`what`, `who`, `when`) as a verifiable proof with a transaction hash.

**Use cases**:

- Publish counselor/agent attestations onchain
- Provide a tamper-evident proof timeline for accountability

## 📁 Module Structure

```plaintext
backend/app/domains/blockchain/
├── __init__.py                  # Multi-chain exports (+ graceful stubs)
├── base_web3.py                 # Shared Web3 utilities
├── README.md                    # This file
│
├── nft/                         # Multi-chain NFT client (preferred)
│   ├── chain_registry.py        # Supported badge chains + config
│   ├── base_nft_client.py       # Shared minting/status logic
│   └── nft_client_factory.py    # Per-chain client factory
│
├── attestation/                 # Onchain attestation registry clients
│
└── edu_chain/                   # Legacy EDU Chain NFT contracts (deprecated)
```

## 🔌 Usage

```python
from app.domains.blockchain import NFTClientFactory, SUPPORTED_CHAINS

client = await NFTClientFactory.get_client(chain_id)
await client.mint_badge(user_address, token_id, amount, metadata_uri)
```

```python
from app.domains.blockchain import AttestationClientFactory

client = await AttestationClientFactory.get_client(chain_id)
await client.publish_attestation(record_id, payload_hash)
```

## ⚙️ Configuration

Set the relevant RPC URLs, private keys, and deployed contract addresses in the
root `.env` / `blockchain/.env`. See `blockchain/.env.example` and
`backend/env.example` for the full list of supported variables.

Badge chains: `UGM_JOURNAL_BADGES_ADDRESS`, `BSC_NFT_CONTRACT_ADDRESS`, …
Attestation: `BSC_ATTESTATION_CONTRACT_ADDRESS`, `BSC_MAINNET_ATTESTATION_CONTRACT_ADDRESS`, …
