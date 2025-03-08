import openai
from app.config import OPENAI_API_KEY

class AikaLLM:
    def __init__(self):
        openai.api_key = OPENAI_API_KEY

    def chat(self, user_input: str, history: list):
        messages = [{"role": "system", "content": "You are Aika, a supportive mental health AI."}] + history
        messages.append({"role": "user", "content": user_input})

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=messages
        )

        return response["choices"][0]["message"]["content"]
