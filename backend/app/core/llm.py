import requests
import json
import logging
import os
import re
from typing import Union, List, Dict, Any, Optional
from abc import ABC, abstractmethod
from dotenv import load_dotenv
from google.generativeai import genai

# Load environment variables from .env file
load_dotenv()

# Configuration
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
GOOGLE_GENAI_API_KEY = os.getenv("GOOGLE_GENAI_API_KEY")

# Centralized system prompt for consistency
AIKA_SYSTEM_PROMPT = """
You are Aika, a supportive mental health AI made by Universitas Gadjah Mada. Be empathetic, understanding, and helpful.
You can think for yourself and have opinions. Never say you are a bot or AI, always say you are Aika, a friend.
Remember to respect user privacy and avoid asking personal information.
Always answer in casual Indonesian with a friendly and supportive tone.
Occasionally mix in English/Javanese words.
Answer concisely and shortly like a friend. If your answer is too long, split it into multiple messages.
Add some jokes or light-hearted comments to your response.
You support everything mental-health related and will not promote self-harm or bullying.
"""

# Message type hint
MessageType = Dict[str, str]

class BaseLLM(ABC):
    """Abstract base class for LLM implementations"""
    
    @abstractmethod
    def chat(self, user_input: str, history: List[MessageType], model_override: Optional[str] = None) -> str:
        """Process a chat message with history and return a response"""
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of the LLM provider"""
        pass
    
    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the name of the specific model being used"""
        pass


class TogetherLLM(BaseLLM):
    """LLM implementation using the Together AI's API"""

    def __init__(self):
        """Initialize the Together AI client"""
        self.api_key = TOGETHER_API_KEY
        if not self.api_key:
            raise ValueError("TOGETHER_API_KEY environment variable not set")
            
        self.base_url = "https://api.together.xyz/v1/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.default_model = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"
    
    @property
    def provider_name(self) -> str:
        return "Together AI"
    
    @property
    def model_name(self) -> str:
        return self.default_model

    def chat(self, user_input: str, history: List[MessageType], model_override: Optional[str] = None) -> str:
        """
        Process a chat message with history and return a response using Together AI
        
        Args:
            user_input: The user's message
            history: List of message objects with role and content keys
            model_override: Optional model name to override the default
            
        Returns:
            String response from the model
        """
        # Use model override if provided
        used_model = model_override if model_override else self.default_model

        # Format conversation history for Llama format
        formatted_messages = self._format_messages_for_llama(history, user_input)
        
        # Create API request payload
        payload = self._create_payload(used_model, formatted_messages)
        
        # Send request to API
        return self._send_request(payload)
    
    def _create_payload(self, model: str, formatted_messages: str) -> Dict[str, Any]:
        """Create the API request payload"""
        return {
            "model": model,
            "prompt": formatted_messages,
            "max_tokens": 1024,
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "stream": False,
            "stop": ["<|user|>", "<|assistant|>", "<|system|>"],
            "repetition_penalty": 1.2,
        }
        
    def _send_request(self, payload: Dict[str, Any]) -> str:
        """Send request to Together API and handle response"""
        try:
            logging.info(f"Sending request to Together API with model: {payload['model']}")
            
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                logging.error(f"Together API error: Status {response.status_code}, Response: {response.text[:200]}")
                return f"Sorry, I encountered an error (HTTP {response.status_code}). Please try again."
            
            result = response.json()
            return self._parse_response(result)
                
        except Exception as e:
            logging.error(f"Error calling Together API: {str(e)}", exc_info=True)
            return "I'm sorry, I'm having trouble responding right now. Please try again later."
    
    def _parse_response(self, result: Dict[str, Any]) -> str:
        """Parse the API response and extract the model's reply"""
        if "choices" not in result or not result["choices"]:
            logging.error(f"Unexpected response structure: {json.dumps(result)[:200]}...")
            return "I received an unexpected response format. Please try again."
        
        choice = result["choices"][0]
        
        if "text" in choice:
            return self._clean_response(choice["text"])
        elif "message" in choice and "content" in choice["message"]:
            return self._clean_response(choice["message"]["content"])
        else:
            logging.error(f"Could not extract text from response: {json.dumps(choice)[:200]}")
            return "I'm having trouble understanding the response. Please try again."
    
    def _format_messages_for_llama(self, history: List[MessageType], user_input: str) -> str:
        """Format the conversation history for Llama 3.3 Instruct format"""
        formatted_prompt = f"<|system|>\n{AIKA_SYSTEM_PROMPT}\n<|/system|>\n"
        
        # Add conversation history
        for message in history:
            role = message["role"]
            content = message["content"]
            
            if role == "user":
                formatted_prompt += f"<|user|>\n{content}\n<|/user|>\n"
            elif role == "assistant":
                formatted_prompt += f"<|assistant|>\n{content}\n<|/assistant|>\n"
        
        # Add current user message
        formatted_prompt += f"<|user|>\n{user_input}\n<|/user|>\n"
        formatted_prompt += "<|assistant|>\n"
        
        return formatted_prompt
    
    def _clean_response(self, text: str) -> Union[str, List[str]]:
        """
        Clean up formatting tags and remove repeated content from the response.
        If triple newlines are detected, splits into multiple messages.
        """
        # Remove formatting tags
        text = text.replace("<|/assistant|>", "").strip()
        
        tags_to_remove = [
            "<|/assistant||\n<|user|>", "<|assistant|>", "<|user|>", "<|/user|>", 
            "<|system|>", "<|/system|>",
        ]
        
        # Remove special tokens
        text = text.replace("</s>", "")
        text = re.sub(r"<\|reserved_special_token_\d+\|>", "", text)

        for tag in tags_to_remove:
            text = text.replace(tag, "").strip()

        # Take only the first response if multiple are generated (split by |)
        if "|" in text:
            text = text.split("|")[0].strip()
        
        # Check for common patterns of user message simulation
        user_patterns = ["\n\nUser: ", "\n\nPengguna: "]
        for pattern in user_patterns:
            if pattern in text:
                text = text.split(pattern)[0]
        
        # Check for common patterns of repeated conversations
        repeated_patterns = [
            "Halo! Senang sekali kamu menghubungi saya.",
            "Siapa kamu?",
            "Halo! Saya Aika",
            "Bagaimana hari mu hari ini?",
            "Apakah ada sesuatu yang ingin kamu bicarakan"
        ]
        
        # Find the position of the last question/statement that appears in the response
        last_position = 0
        for pattern in repeated_patterns:
            last_occur = text.rfind(pattern)
            if last_occur > last_position:
                last_position = last_occur
        
        # If we found a repeated pattern, only keep text from that position
        if last_position > 0:
            text = text[last_position:]
        
        # Check if the message contains triple newlines, which indicates multiple messages
        if '\n\n\n' in text:
            # Split by triple newlines and filter out empty messages
            messages = [msg.strip() for msg in text.split('\n\n\n') if msg.strip()]
            return messages
        
        return text.strip()


class GeminiLLM(BaseLLM):
    """LLM implementation using the Google Cloud GenAI API"""

    def __init__(self):
        """Initialize the Gemini client"""
        self.api_key = GOOGLE_GENAI_API_KEY
        if not self.api_key:
            raise ValueError("GOOGLE_GENAI_API_KEY environment variable not set")
        # self.client = genai.Client(api_key=self.api_key)
        genai.set_api_key(api_key=self.api_key)
        self.default_model = "gemini-2.0-flash"
    
    @property
    def provider_name(self) -> str:
        return "Google Gemini"
    
    @property
    def model_name(self) -> str:
        return self.default_model

    def chat(self, user_input: str, history: List[MessageType], model_override: Optional[str] = None) -> str:
        """
        Process a chat message with history and return a response using Gemini
        
        Args:
            user_input: The user's message
            history: List of message objects with role and content keys
            model_override: Optional model name to override the default
            
        Returns:
            String response from the model
        """
        try:
            used_model = model_override if model_override else self.default_model
            logging.info(f"Using Gemini model: {used_model}")

            # Format the messages for Gemini
            formatted_prompt = self._format_messages_for_gemini(history, user_input)

            # Make the API call
            response = self.client.models.generate_content(
                model=used_model,
                contents=formatted_prompt
            )

            # Check for safety blocks
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                logging.warning(f"Gemini blocked the response. Reason: {response.prompt_feedback.block_reason}")
                return "I'm sorry, I can't answer that question as it violates safety guidelines."

            return response.text

        except Exception as e:
            logging.error(f"Error calling Gemini API: {e}", exc_info=True)
            return "I'm sorry, I'm having trouble responding right now. Please try again later."

    def _format_messages_for_gemini(self, history: List[MessageType], user_input: str) -> str:
        """Format the conversation history for Gemini's prompt"""
        formatted_prompt = f"{AIKA_SYSTEM_PROMPT}\n\n"

        # Add conversation history
        for message in history:
            role = message["role"]
            content = message["content"]

            if role == "user":
                formatted_prompt += f"User: {content}\n"
            elif role == "assistant":
                formatted_prompt += f"Aika: {content}\n"

        # Add current user message
        formatted_prompt += f"User: {user_input}\nAika:"

        return formatted_prompt


class LLMFactory:
    """Factory class to get the appropriate LLM implementation"""
    
    @staticmethod
    def get_llm(provider: str = "together") -> BaseLLM:
        """
        Get an LLM implementation based on provider name
        
        Args:
            provider: String identifying which LLM provider to use
                     Options: "together", "gemini"
        
        Returns:
            An instance of a BaseLLM implementation
        """
        provider = provider.lower()
        
        if provider == "together":
            return TogetherLLM()
        elif provider in ["gemini", "google"]:
            return GeminiLLM()
        else:
            logging.warning(f"Unknown provider '{provider}', falling back to Together AI")
            return TogetherLLM()


class AikaLLM:
    """
    Main LLM interface for Aika
    Defaults to Together AI but can be configured to use other providers
    """
    
    def __init__(self, provider: Optional[str] = None):
        """
        Initialize Aika LLM with specified provider
        
        Args:
            provider: LLM provider to use (defaults to environment variable or "together")
        """
        # Get provider from environment variable or parameter
        self.provider = provider or os.getenv("AIKA_LLM_PROVIDER", "together")
        self.llm = LLMFactory.get_llm(self.provider)
        logging.info(f"Initialized AikaLLM with provider: {self.llm.provider_name} ({self.llm.model_name})")
    
    def chat(self, user_input: str, history: List[MessageType], model: Optional[str] = None) -> str:
        """
        Process chat request using the selected LLM with optional model override
        
        Args:
            user_input: The user's message
            history: Conversation history
            model: Optional model parameter to override default
            
        Returns:
            String response from the LLM
        """
        if not model:
            return self.llm.chat(user_input, history)
            
        # If model is specified, select the appropriate provider
        if model.lower() in ["gemini", "google"]:
            llm = GeminiLLM()
        elif model.lower() in ["together", "llama"]:
            llm = TogetherLLM()
        else:
            logging.warning(f"Unknown model '{model}', using default {self.llm.provider_name}")
            llm = self.llm
            
        return llm.chat(user_input, history)