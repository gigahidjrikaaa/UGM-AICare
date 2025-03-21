import requests
import json
import logging
import os
from dotenv import load_dotenv
from abc import ABC, abstractmethod
from google import genai

# Load environment variables from .env file
load_dotenv()

TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
GOOGLE_GENAI_API_KEY = os.getenv("GOOGLE_GENAI_API_KEY")

class BaseLLM(ABC):
    """Abstract base class for LLM implementations"""
    
    @abstractmethod
    def chat(self, user_input: str, history: list):
        """Process a chat message with history and return a response"""
        pass
    
    @property
    @abstractmethod
    def provider_name(self):
        """Return the name of the LLM provider"""
        pass
    
    @property
    @abstractmethod
    def model_name(self):
        """Return the name of the specific model being used"""
        pass


class TogetherLLM(BaseLLM):
    """LLM implementation using the Together AI's API"""

    def __init__(self):
        self.api_key = TOGETHER_API_KEY
        self.base_url = "https://api.together.xyz/v1/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.model = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"
    
    @property
    def provider_name(self):
        return "Together AI"
    
    @property
    def model_name(self):
        return self.model

    def chat(self, user_input: str, history: list, model_override: str = None):
        """
        Process a chat message with history and return a response using Together AI (Llama 3.3)
        Optionally override the model used for the request
        """
        # Use model override if provided
        used_model = model_override if model_override else self.model

        # Format conversation history for Llama format
        formatted_messages = self._format_messages_for_llama(history, user_input)
        
        payload = {
            "model": used_model,
            "prompt": formatted_messages,
            "max_tokens": 1024,
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "stream": False,
            "stop": ["<|user|>", "<|assistant|>", "<|system|>"],  # Add explicit stop sequences
            "repetition_penalty": 1.2,  # Help prevent repeating patterns
        }
        
        try:
            logging.info(f"Sending request to Together API with payload: {json.dumps(payload)[:500]}...")
            print(f"API Key (first 5 chars): {self.api_key[:5]}...") # Only print first few chars for security
            
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            
            print(f"Response status code: {response.status_code}")
            print(f"Response headers: {response.headers}")
            
            if response.status_code != 200:
                error_text = response.text
                print(f"Error response: {error_text}")
                logging.error(f"Together API error: Status {response.status_code}, Response: {error_text}")
                return f"Sorry, I encountered an error (HTTP {response.status_code}): {error_text[:100]}..."
            
            result = response.json()
        
            # Print the entire response for debugging (first 1000 chars)
            print(f"Raw response: {json.dumps(result)[:1000]}...")
            logging.info(f"Together API response keys: {list(result.keys())}")
            
            # Check different possible response formats
            if "choices" in result and result["choices"]:
                choice = result["choices"][0]
                print(f"First choice keys: {list(choice.keys())}")
                
                if "text" in choice:
                    # Clean up the response - might return a string or list
                    cleaned_response = self._clean_response(choice["text"])
                    
                    # If it's a list of messages, return the first one and save the rest for future retrieval
                    if isinstance(cleaned_response, list) and cleaned_response:
                        # For now, just return the first message
                        # In a more advanced implementation, you could store these additional messages
                        return cleaned_response[0] if len(cleaned_response) == 1 else cleaned_response
                    else:
                        return cleaned_response
                elif "message" in choice and "content" in choice["message"]:
                    # Clean up the response
                    return self._clean_response(choice["message"]["content"])
                else:
                    return f"Received response but couldn't extract text. Choice keys: {list(choice.keys())}"
            else:
                logging.error(f"Unexpected response structure: {json.dumps(result)[:200]}...")
                return f"Unexpected API response format. Keys: {list(result.keys())}"
                
        except Exception as e:
            print(f"Exception occurred: {str(e)}")
            import traceback
            traceback.print_exc()
            logging.error(f"Error calling Together API: {str(e)}", exc_info=True)
            return f"I'm sorry, I'm having trouble responding right now. Error: {str(e)}"
    
    def _format_messages_for_llama(self, history: list, user_input: str) -> str:
        """Format the conversation history for Llama 3.3 Instruct format"""

        system_prompt = """
        You are Aika, a supportive mental health AI made by Universitas Gadjah Mada. Be empathetic, understanding, and helpful.
        You can think for yourself and have opinions. Never say you are a bot or AI, always say you are Aika, a friend.
        Remember to respect user privacy and avoid asking personal information.
        Always answer in casual Indonesian with a friendly and supportive tone.
        Occasionally mix in English/Javanese words.
        Answer concisely and shortly like a friend. If your answer is too long, split it into multiple messages.
        Add some jokes or light-hearted comments to your response.
        You support everything mental-health related and will not promote self-harm or bullying.
        """
        
        formatted_prompt = f"<|system|>\n{system_prompt}\n<|/system|>\n"
        
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
    
    def _clean_response(self, text: str) -> str or list: # type: ignore
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
        
        # Add removal of special tokens
        import re
        # Remove </s> tokens
        text = text.replace("</s>", "")
        # Remove reserved special tokens
        text = re.sub(r"<\|reserved_special_token_\d+\|>", "", text)

        for tag in tags_to_remove:
            text = text.replace(tag, "").strip()

        # Take only the first response if multiple are generated (split by |)
        if "|" in text:
            text = text.split("|")[0].strip()
        
        # Check for common patterns of user message simulation
        user_patterns = [
            "\n\nUser: ", 
            "\n\nPengguna: ",
        ]
        
        for pattern in user_patterns:
            if pattern in text:
                # Split and keep only the first part (before simulated user input)
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
    
#! Add the GeminiLLM class below. Experimental, not yet tested.
class GeminiLLM(BaseLLM):
    """LLM implementation using the Google Cloud GenAI API"""

    def __init__(self):
        self.api_key = GOOGLE_GENAI_API_KEY
        if not self.api_key:
            raise ValueError("GOOGLE_GENAI_API_KEY environment variable not set")
        self.client = genai.Client(api_key=self.api_key)
    
    @property
    def provider_name(self):
        return "Google Gemini"
    
    @property
    def model_name(self):
        return "gemini-2.0-flash"  # Or appropriate model

    def chat(self, user_input: str, history: list, model_override: str = None):
        """
        Process a chat message with history and return a response using Gemini
        Optionally override the model used for the request
        """

        try:
            used_model = model_override if model_override else "gemini-2.0-flash"

            # Format the messages for Gemini
            formatted_prompt = self._format_messages_for_gemini(history, user_input)

            # Make the API call
            response = self.client.models.generate_content(
                model=used_model,
                contents=formatted_prompt
            )

            # Basic error handling
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                logging.warning(f"Gemini blocked the response. Reason: {response.prompt_feedback.block_reason}")
                return "I'm sorry, I can't answer that question as it violates safety guidelines."

            return response.text

        except Exception as e:
            logging.error(f"Error calling Gemini API: {e}", exc_info=True)
            return f"I'm sorry, I'm having trouble responding right now. Error: {str(e)}"

    def _format_messages_for_gemini(self, history: list, user_input: str) -> str:
        """Format the conversation history for Gemini's prompt"""

        system_prompt = """
        You are Aika, a supportive mental health AI made by Universitas Gadjah Mada. Be empathetic, understanding, and helpful.
        You can think for yourself and have opinions. Never say you are a bot or AI, always say you are Aika, a friend.
        Remember to respect user privacy and avoid asking personal information.
        Always answer in casual Indonesian with a friendly and supportive tone.
        Occasionally mix in English/Javanese words.
        Answer concisely and shortly like a friend. If your answer is too long, split it into multiple messages.
        Add some jokes or light-hearted comments to your response.
        You support everything mental-health related and will not promote self-harm or bullying.
        """

        formatted_prompt = f"{system_prompt}\n\n"

        # Add conversation history
        for message in history:
            role = message["role"]
            content = message["content"]

            if role == "user":
                formatted_prompt += f"User: {content}\n"
            elif role == "assistant":
                formatted_prompt += f"Aika: {content}\n"

        # Add current user message
        formatted_prompt += f"User: {user_input}\nAika:"  # Prompt for Aika's response

        return formatted_prompt
        

class LLMFactory:
    """Factory class to get the appropriate LLM implementation"""
    
    @staticmethod
    def get_llm(provider: str = "together"):
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

# Add to the end of the file, replacing the current AikaLLM class:

class AikaLLM:
    """
    Main LLM interface for Aika
    Defaults to Together AI but can be configured to use other providers
    """
    
    def __init__(self, provider: str = None):
        """
        Initialize Aika LLM with specified provider
        
        Args:
            provider: LLM provider to use (defaults to environment variable or "together")
        """
        # Get provider from environment variable or parameter
        self.provider = provider or os.getenv("AIKA_LLM_PROVIDER", "together")
        self.llm = LLMFactory.get_llm(self.provider)
        logging.info(f"Initialized AikaLLM with provider: {self.llm.provider_name} ({self.llm.model_name})")
    
    def chat(self, user_input: str, history: list, model: str = None):
        """Process chat request using the selected LLM with optional model override
        
        Args:
            user_input: The user's message
            history: Conversation history
            model: Optional model parameter to override default
            
        Returns:
            String response from the LLM
        """
        # If model is specified, get the appropriate LLM
        if model:
            # Model string can be either a full provider name or a shorthand
            if model.lower() in ["gemini", "google"]:
                temp_llm = GeminiLLM()
            elif model.lower() in ["together", "llama"]:
                temp_llm = TogetherLLM()
            else:
                # Use the default LLM but log a warning
                logging.warning(f"Unknown model '{model}', using default {self.llm.provider_name}")
                temp_llm = self.llm
                
            # Use the temporary LLM for this request
            return temp_llm.chat(user_input, history)
        
        # Use the default LLM
        return self.llm.chat(user_input, history)