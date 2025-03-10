import requests
import json
import logging
from app.config import TOGETHER_API_KEY

class AikaLLM:
    def __init__(self):
        self.api_key = TOGETHER_API_KEY
        self.base_url = "https://api.together.xyz/v1/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.model = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"
    
    def chat(self, user_input: str, history: list):
        # Format conversation history for Llama format
        formatted_messages = self._format_messages_for_llama(history, user_input)
        
        payload = {
            "model": self.model,
            "prompt": formatted_messages,
            "max_tokens": 1024,
            "temperature": 0.7,
            "top_p": 0.9,
            "stream": False
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
            print(f"Response JSON keys: {result.keys()}")
            logging.info(f"Together API response structure: {json.dumps(result.keys())}")
            
            # Extract text from response (adjust this based on actual response structure)
            if "choices" in result and result["choices"] and "text" in result["choices"][0]:
                return result["choices"][0]["text"].strip()
            else:
                print(f"Unexpected response structure: {json.dumps(result)}")
                logging.error(f"Unexpected response structure: {json.dumps(result)[:200]}...")
                return "I'm sorry, I received an unexpected response format."
                
        except Exception as e:
            print(f"Exception occurred: {str(e)}")
            import traceback
            traceback.print_exc()
            logging.error(f"Error calling Together API: {str(e)}", exc_info=True)
            return f"I'm sorry, I'm having trouble responding right now. Error: {str(e)}"
    
    def _format_messages_for_llama(self, history: list, user_input: str) -> str:
        """Format the conversation history for Llama 3.3 Instruct format"""
        system_prompt = """
        You are Aika, a supportive mental health AI. Be empathetic, understanding, and helpful.
        Provide support and resources to help the user feel better. Remember to be positive and reassuring.
        Answer in casual Indonesian language. Use some Yogyakarta/Indonesian slang to make it more friendly."""
        
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