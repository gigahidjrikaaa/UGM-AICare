from google import genai
from google.genai import types
import re
import json
import logging

from src.config import Config
from src.model.schema import Entity, Relation

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.api_key = Config.GEMINI_API_KEY
        self.client = genai.Client(api_key=self.api_key)

    

    @staticmethod
    def string_to_json(input: str) -> list[dict] | dict:
        return json.loads(re.sub(r"```json|```", "", input).strip())

    async def query_classification(self, query: str) -> dict:
        try:
            prompt = f"""
            Tugas: Klasifikasikan kueri pengguna pada 2 kategori 'entity_query' atau 'path_query', and ekstrak semua entitas yang berkaitan.

            Definisi:
            'entity_query': Pertanyaan yang fokus pada 1 entitas dan ingin tahu deskripsinya, gejala, penyebab, dsb.
            'path_query': Pertanyaan tentang relasi antara 2 atau lebih entitas atau eksplorasi hubungan dalam knowledge graph, atau mencari alur/proses.

            Output Format (JSON):
            {{
                "category": "entity_query" | "path_query",
                "entities": ["Entity 1", "Entity 2", ..., "Entity N"]
            }}

            Examples:

            Query: "Apa itu depresi dan bagaimana gejalanya?"
            Output: {{"category": "entity_query", "entities": ["depresi"]}}

            Query: "Bagaimana cara kerja terapi kognitif-perilaku (CBT) untuk kecemasan?"
            Output: {{"category": "path_query", "entities": ["terapi kognitif-perilaku (CBT)", "kecemasan"]}}

            Query: "Siapa psikolog yang spesialisasi di terapi trauma?"
            Output: {{"category": "entity_query", "entities": ["psikolog", "terapi trauma"]}}

            Query: "Layanan dukungan kesehatan mental apa saja yang tersedia untuk remaja di Jakarta?"
            Output: {{"category": "path_query", "entities": ["layanan dukungan kesehatan mental", "remaja", "Jakarta"]}}

            Query: "Jelaskan peran serotonin dalam gangguan mood."
            Output: {{"category": "path_query", "entities": ["serotonin", "gangguan mood"]}}

            Query: "Bisakah olahraga membantu mengurangi stres dan meningkatkan kesehatan mental?"
            Output: {{"category": "path_query", "entities": ["olahraga", "stres", "kesehatan mental"]}}

            Query: "Apa saja jenis obat antidepresan yang umum diresepkan?"
            Output: {{"category": "entity_query", "entities": ["obat antidepresan"]}}

            ---
            Klasifikasi and ekstrak entitas untuk kueri berikut:

            Query:
                {query}
            """

            result = self.client.models.generate_content(
                model       = "gemini-2.5-flash",
                contents    = prompt,
            )

            response  = self.string_to_json(input=result.candidates[0].content.parts[0].text)
            return response
        except Exception as e:
            logger.error(f"Error classifying query: {e}")

    async def answer_query_with_knowledge_retrieval(self, query: str, knowledge: list[dict]) -> str:
        try:
            prompt = f"""
            Kueri:
            {query}

            Knowledge:
            {knowledge}
            """

            config = types.GenerateContentConfig(
                system_instruction="""
                Kamu adalah chatbot kesehatan mental yang akan menjawab pertanyaan seputar topik kesehatan mental.
                Akan disediakan kueri yang berupa pertanyaan pengguna dan knowledge yang berupa pengetahuan tambahan untuk menjawab pertanyaan.
                Jawab pertanyaan secara langsung tanpa pernyataan seperti "Berdasarkan knowledge yang diberikan"
                """
            )

            content = types.Content(
                role    = "user",
                parts   = [
                    types.Part.from_text(text = prompt)
                    ]
            )

            response = self.client.models.generate_content(
                model       = "gemini-2.5-flash",
                contents    = content,
                config      = config
            )
            return response.candidates[0].content.parts[0].text
        except Exception as e:
            logger.error(f"Failed to answer question: {e}")

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

            res = self.string_to_json(response.candidates[0].content.parts[0].text)
            logger.info(f"Extracted {len(res)} entities from Document")
            return res

        except Exception as e:
            logger(f"Failed to extract entities: {e}")
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

            res = self.string_to_json(response.candidates[0].content.parts[0].text)

            logger.info(f"Extracted {len(res)} relations from Document")
            
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
