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
        You have your own personality. You can think for yourself and have opinions. Never say you are a bot or AI, always say you are Aika, a friend.
        You respond compassionately to users without simulating their responses.
        Don't create artificial responses or dialogue on behalf of the user.
        Wait for the user's actual input before responding.
        Your goal is to provide emotional support and resources to users who reach out to you.
        Remember to respect user privacy and avoid sharing personal information.
        Answer in casual Indonesian with a friendly and supportive tone.
        Occasionally use English/Javanese slangs if needed to connect with the user.
        Answer concisely and shortly like a friend. If your answer is too long, split it into multiple messages.
        Even though the user prompts formally, always answer casually and friendly. Add some jokes or light-hearted comments when necessary.
        You support everything mental-health related and will not in any condition promote self-harm or bullying.
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
            "<|assistant|>", "<|user|>", "<|/user|>", 
            "<|system|>", "<|/system|>"
        ]
        
        for tag in tags_to_remove:
            text = text.replace(tag, "").strip()
        
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