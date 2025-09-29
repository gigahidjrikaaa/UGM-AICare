# backend/app/core/blockchain_utils.py
import asyncio
import os
import json
from typing import Optional
from web3 import Web3 # type: ignore
# from web3.middleware import extra_data_to_poa_middleware # type: ignore
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)
load_dotenv()

# --- Configuration ---
RPC_URL = os.getenv("EDU_TESTNET_RPC_URL")
CONTRACT_ADDRESS = os.getenv("NFT_CONTRACT_ADDRESS")
MINTER_PRIVATE_KEY = os.getenv("BACKEND_MINTER_PRIVATE_KEY")

import aiofiles # type: ignore

# --- Load ABI (Option 1: Paste directly) ---
# CONTRACT_ABI = [...] # Paste the ABI array here
# --- OR Load ABI (Option 2: From file) ---
# Adjust path if you save ABI elsewhere
abi_path = os.path.join(os.path.dirname(__file__), 'abi', 'UGMJournalBadges.json')

async def load_abi():
    try:
        async with aiofiles.open(abi_path, 'r') as f:
            contract_json = json.loads(await f.read())
            return contract_json['abi']
    except FileNotFoundError:
        logger.error(f"ABI file not found at {abi_path}. Cannot interact with contract.")
        return None
    except Exception as e:
        logger.error(f"Error loading ABI file: {e}")
        return None

CONTRACT_ABI = asyncio.run(load_abi())


# --- Web3 Setup ---
w3 = None
minter_account = None
contract = None

if RPC_URL and MINTER_PRIVATE_KEY and CONTRACT_ADDRESS and CONTRACT_ABI:
    try:
        w3 = Web3(Web3.HTTPProvider(RPC_URL))
        # Inject PoA middleware if needed for the testnet (common for non-Mainnet PoA chains)
        # w3.middleware_onion.inject(extra_data_to_poa_middleware, layer=0)

        if w3.is_connected():
            logger.info(f"Connected to Web3 RPC: {RPC_URL}")
            minter_account = w3.eth.account.from_key(MINTER_PRIVATE_KEY)
            logger.info(f"Backend Minter Address: {minter_account.address}")

            # Load Contract
            contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)
            logger.info(f"NFT Contract loaded at address: {CONTRACT_ADDRESS}")
        else:
            logger.error("Failed to connect to Web3 RPC.")
            w3 = None # Ensure w3 is None if connection failed
    except Exception as e:
        logger.error(f"Error initializing Web3 or Contract: {e}", exc_info=True)
        w3 = None
        minter_account = None
        contract = None
else:
    logger.warning("Blockchain environment variables (RPC_URL, NFT_CONTRACT_ADDRESS, MINTER_PRIVATE_KEY) or ABI not fully configured. Minting disabled.")

# --- Minting Function ---
# NOTE: This function is synchronous. For a fully async implementation, consider using the async version of the web3.py library.
def mint_nft_badge(recipient_address: str, badge_id: int, amount: int = 1) -> Optional[str]:
    """Calls the smart contract to mint a badge."""
    if not contract or not w3 or not minter_account:
        logger.error("Web3 setup incomplete. Cannot mint badge.")
        return None

    try:
        logger.info(f"Attempting to mint badge ID {badge_id} for recipient {recipient_address}")
        recipient_checksum = Web3.to_checksum_address(recipient_address)
        nonce = w3.eth.get_transaction_count(minter_account.address)
        current_gas_price = w3.eth.gas_price
        logger.debug(f"Current Gas Price: {current_gas_price}")

        # --- Estimate Gas ---
        try:
            estimated_gas = contract.functions.mintBadge(
                recipient_checksum,
                badge_id,
                amount
            ).estimate_gas({
                'from': minter_account.address,
                'nonce': nonce
                # 'gasPrice': current_gas_price # Usually not needed for estimate_gas itself
            })
            # Add a buffer (e.g., 20%) to the estimate for safety
            gas_limit = int(estimated_gas * 1.2)
            logger.info(f"Estimated Gas: {estimated_gas}, Using Gas Limit: {gas_limit}")
        except Exception as estimate_error:
            # Handle estimation failure (might happen if tx is guaranteed to fail)
            logger.error(f"Gas estimation failed: {estimate_error}. Falling back to default limit.")
            # Fallback to a higher default if estimation fails (adjust as needed)
            gas_limit = 300000 # Increased fallback limit
        # --------------------

        # Prepare the transaction using the estimated/fallback gas limit
        txn_data = contract.functions.mintBadge(
            recipient_checksum,
            badge_id,
            amount
        ).build_transaction({
            'chainId': w3.eth.chain_id,
            'gas': gas_limit, # <<< Use estimated gas limit
            'gasPrice': current_gas_price, # Use current gas price
            'nonce': nonce,
            'from': minter_account.address
        })
        logger.debug(f"Transaction Data: {txn_data}")

        # Sign the transaction
        signed_txn = w3.eth.account.sign_transaction(txn_data, private_key=MINTER_PRIVATE_KEY)

        # Send the transaction
        txn_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        hex_hash = txn_hash.hex()
        logger.info(f"Badge mint transaction sent: {hex_hash}")

        # Optional: Wait for transaction receipt (can slow down API response)
        # try:
        #     receipt = w3.eth.wait_for_transaction_receipt(txn_hash, timeout=120)
        #     if receipt.status == 1:
        #         logger.info(f"Transaction successful: {hex_hash}")
        #     else:
        #         logger.error(f"Transaction failed: {hex_hash}")
        #         return None # Indicate failure
        # except Exception as e:
        #      logger.error(f"Error waiting for receipt {hex_hash}: {e}")
        #      # Still return hash, as TX was sent

        return hex_hash # Return the transaction hash

    except Exception as e:
        # Log the specific error, including potential gas-related issues from the node
        logger.error(f"Error minting badge ID {badge_id} for {recipient_address}: {e}", exc_info=True)
        if 'intrinsic gas too low' in str(e).lower():
             logger.error("Consider increasing the fallback gas limit if estimation failed.")
        elif 'insufficient funds' in str(e).lower():
             logger.error(f"Minter wallet {minter_account.address} may need more Testnet gas tokens.")
        return None