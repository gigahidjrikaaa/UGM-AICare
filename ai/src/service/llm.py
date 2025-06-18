from google import genai
from google.genai import types
import re
import json

from src.config import Config
from src.model.schema import Entity, Relation

class LLMService:
    def __init__(self):
        self.api_key = Config.GEMINI_API_KEY
        self.client = genai.Client(api_key=self.api_key)

    

    @staticmethod
    def string_to_list(input: str) -> list[dict]:
        return json.loads(re.sub(r"```json|```", "", input).strip())


    async def extract_entities(self, text: str) -> list[dict]:
        """Extract entites within document using LLM approaches"""
        try:
            config = types.GenerateContentConfig(
                system_instruction= 
                    """
                    Instruction:
                    Ekstrak daftar entitas dari dokumen berikut untuk membentuk knowledge graph. Setiap entitas harus memiliki nama, tipe, dan deskripsi penting.

                    Jawaban hanya dalam format JSON list tanpa penjelasan tambahan:
                    [ 
                        { 
                            "name" : "nama_entitas",
                            "type": "tipe_entitas",
                            "description" : "penjelasan singkat"
                        },
                    ]
                    """
            )

            content = types.Content(
                role="user",
                parts= [
                    types.Part.from_text(text=f"Text: \n {text}")
                ]
            )

            response = self.client.models.generate_content(
                model = "gemini-2.5-flash",
                contents = content,
                config = config
            )

            res = self.string_to_list(response.candidates[0].content.parts[0].text)

            return res

        except Exception as e:
            print(f"[ERROR] Failed to extract entities: {e}")
            return None 
        
    async def extract_relations(self, text: str, entities: list) -> list[dict]:
        """Extract relations between entities using LLM approaches"""

        try:
            config = types.GenerateContentConfig(
                system_instruction= """
                    Instruction:
                    Ekstrak hubungan antar entitas yang ditemukan dalam dokumen. Gunakan daftar entitas dan teks sebagai acuan.
                    Jawaban hanya dalam format JSON list tanpa penjelasan tambahan:
                    [ 
                        {
                            "source_entity": "nama_entitas_1",
                            "target_entity": "nama_entitas_2",
                            "name": "nama_relasi",
                            "type": "tipe_relasi"
                        },
                    ]
                    """
            )

            content = types.Content(
                role="user",
                parts= [
                    types.Part.from_text(text=f"Entities: \n {entities}"),
                    types.Part.from_text(text=f"Text: \n {text}")
                ]
            )

            response = self.client.models.generate_content(
                model = "gemini-2.5-flash",
                contents = content,
                config = config
            )

            res = self.string_to_list(response.candidates[0].content.parts[0].text)

            return res
        except Exception as e:
            print(f"[ERROR] Failed to extract relations: {e}")
            return None

    async def get_embeddings(self, input: list[str], task: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
        """Generate Embeding given text"""
        try:
            response = self.client.models.embed_content(
                model="models/embedding-001",
                contents=input,
                config=types.EmbedContentConfig(
                    task_type=task
                )
            )

            embeddings = [e.values for e in response.embeddings]
            return embeddings
        except Exception as e:
            print(f"[ERROR] Failed to get embeddings: {e}")
            return None

        
    def generate_graph(self, doc: list[str]):
        text = "\n".join(doc)
        
        prompt = f"""
        Extract structured knowledge from the following text in the form of a knowledge graph.
        Return output as a list of triples (subject, predicate, object) .
        
        Text:
        {text}
        """
        try:
            response = self.client.models.generate_content(
                model = "gemini-2.0-flash",
                contents = prompt,
            )

            return response.text
        except Exception as e:
            print(f"[ERROR] Failed to generate graph: {e}")
            return None
