# backend/app/core/llm.py

# backend/app/core/llm.py

import os
import httpx
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from dotenv import load_dotenv
import logging
from typing import List, Dict, Literal, Optional, Tuple

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration ---
GOOGLE_API_KEY = os.environ.get("GOOGLE_GENAI_API_KEY")

DEFAULT_GEMINI_MODEL = "gemini-2.0-flash" 
DEFAULT_GEMMA_LOCAL_MODEL = "gemma-3-12b-it-gguf"

# Configure Gemini client (do this once at module load)
if GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        logger.info("Google Generative AI SDK configured successfully.")
    except Exception as e:
        logger.error(f"Failed to configure Google Generative AI SDK: {e}")
else:
    logger.warning("GOOGLE_API_KEY not found. Gemini API will not be available.")

# --- Provider Type ---
LLMProvider = Literal['gemini', 'gemma_local']

# --- Langchain LLM Object --- 
# This is the primary object that other modules should import and use.
# It's configured to use Gemini by default.
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash", # Using a specific, recommended model
    temperature=0.7,
    convert_system_message_to_human=True, # Important for compatibility
    google_api_key=GOOGLE_API_KEY
)




# --- Constants for default models (can be imported elsewhere) ---
DEFAULT_PROVIDERS = {
    "gemini": DEFAULT_GEMINI_MODEL,
    "gemma_local": DEFAULT_GEMMA_LOCAL_MODEL
}