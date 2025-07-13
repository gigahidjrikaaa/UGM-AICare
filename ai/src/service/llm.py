from google import genai
from google.genai import types
import re
import json
import logging
from typing import List

from src.config import Config
from src.model.schema import Entity, Relation, EntityRelationResponse, EvaluationDataset

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
            Tugas: Klasifikasikan kueri pengguna ke dalam kategori 'entity_query' atau 'path_query', dan ekstrak semua entitas yang relevan.

            Definisi:
            'entity_query' (Query Atribut/Node): Pertanyaan yang fokus untuk mendeskripsikan atau mengambil properti/atribut dari sebuah konsep sentral. Contoh: "Apa itu X?", "Apa saja gejala dari X?".
            'path_query' (Query Relasi/Edge): Pertanyaan tentang hubungan antara dua atau lebih entitas, atau mencari alur/proses. Contoh: "Bagaimana hubungan A dan B?", "Cari A yang terkait dengan B?".

            Output Format (JSON):
            {{
            "category": "entity_query" | "path_query",
            "entities": ["Entity 1", "Entity 2", ..., "Entity N"]
            }}

            Contoh:

            Query: "Apa itu depresi dan bagaimana gejalanya?"
            Output: {{"category": "entity_query", "entities": ["depresi"]}}

            Query: "Apa saja jenis obat antidepresan yang umum diresepkan?"
            Output: {{"category": "entity_query", "entities": ["obat antidepresan"]}}

            Query: "Bagaimana cara kerja terapi kognitif-perilaku (CBT) untuk kecemasan?"
            Output: {{"category": "path_query", "entities": ["terapi kognitif-perilaku (CBT)", "kecemasan"]}}

            Query: "Jelaskan peran serotonin dalam gangguan mood."
            Output: {{"category": "path_query", "entities": ["serotonin", "gangguan mood"]}}

            Query: "Bisakah olahraga membantu mengurangi stres dan meningkatkan kesehatan mental?"
            Output: {{"category": "path_query", "entities": ["olahraga", "stres", "kesehatan mental"]}}

            Query: "Layanan dukungan kesehatan mental apa saja yang tersedia untuk remaja di Jakarta?"
            Output: {{"category": "path_query", "entities": ["layanan dukungan kesehatan mental", "remaja", "Jakarta"]}}

            Query: "Siapa psikolog yang spesialisasi di terapi trauma?"
            Output: {{"category": "path_query", "entities": ["psikolog", "terapi trauma"]}}

            ---
            Klasifikasikan dan ekstrak entitas untuk kueri berikut:

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
        
    
    async def extract_entities_and_relations(self, text: str, chunk_id: str) -> EntityRelationResponse:
        """Extract relations between entities using LLM approaches"""

        try:
            config = types.GenerateContentConfig(
                system_instruction= """
                    INSTRUKSI:
                    Anda adalah sebuah pipeline ekstraksi Knowledge Graph untuk domain kesehatan mental. Dari DOKUMEN yang diberikan, ekstrak semua entitas penting dan relasi di antara mereka. Patuhi struktur JSON dan daftar tipe yang telah ditentukan dengan ketat.

                    LANGKAH-LANGKAH:
                    1.  **Ekstrak Entitas**: Identifikasi entitas, klasifikasikan tipenya, dan berikan deskripsi singkat dari teks.
                    2.  **Ekstrak Relasi**: Identifikasi hubungan langsung antar entitas tersebut. `name` relasi harus berupa frasa kerja dari teks, dan `type` adalah kategorisasi formalnya.

                    ---

                    ### **Sistem Tipe (Ontologi)**

                    **A. Tipe Entitas yang Diizinkan:**
                    * **Gangguan & Kondisi**: `Gangguan_Mental`, `Gejala`, `Kondisi_Medis_Terkait`
                    * **Intervensi & Perawatan**: `Terapi_Psikologis`, `Obat_Medis`, `Layanan_Kesehatan`, `Aktivitas_Kesejahteraan`
                    * **Aktor & Pemangku Kepentingan**: `Profesional_Kesehatan`, `Organisasi`, `Individu`
                    * **Faktor & Konteks**: `Faktor_Risiko`, `Faktor_Pelindung`, `Dokumen_Hukum_Kebijakan`, `Lokasi`
                    * **Data & Konsep**: `Data_Statistik`, `Konsep_Abstrak`
                    * **Jaring Pengaman**: `Lainnya` (Gunakan untuk entitas penting yang tidak cocok dengan kategori lain)

                    **B. Tipe Relasi yang Diizinkan:**
                    * **Sebab-Akibat**: `Menyebabkan`, `Berkontribusi_Pada`, `Mengurangi_Risiko`, `Merupakan_Gejala_Dari`
                    * **Intervensi**: `Mendiagnosis`, `Menangani`, `Meresepkan`, `Menawarkan_Layanan`
                    * **Hierarki & Keanggotaan**: `Adalah_Jenis_Dari`, `Bekerja_Di`, `Berlokasi_Di`
                    * **Deskriptif**: `Memiliki_Atribut`, `Didasarkan_Pada`, `Direkomendasikan_Untuk`
                    * **Jaring Pengaman**: `Terkait_Dengan` (Gunakan untuk hubungan yang jelas tapi tidak cocok kategori lain)

                    ---

                    ### **Struktur Output JSON**
                    {
                    "entities": [
                        { 
                        "name": "nama_entitas",
                        "type": "tipe_entitas_dari_daftar_di_atas",
                        "description": "penjelasan singkat atau kutipan dari dokumen"
                        }
                    ],
                    "relations": [
                        {
                        "source_entity": "nama_entitas_sumber",
                        "target_entity": "nama_entitas_target",
                        "name": "frasa_kerja_dari_dokumen",
                        "type": "tipe_relasi_dari_daftar_di_atas"
                        }
                    ]
                    }

                    ---

                    ### **CONTOH EKSEKUSI**

                    **DOKUMEN:**
                    Kesehatan Jiwa adalah kondisi dimana seorang individu dapat berkembang secara fisik, mental, spiritual, dan sosial. K
                    arakteristik gangguan jiwa secara umum yaitu kombinasi pikiran yang abnormal, emosi, dan persepsi. 
                    Faktor psikologis seperti trauma yang mengakibatkan stres dan faktor biologis seperti genetik merupakan faktor yang berkontribusi terhadap terjadinya gangguan jiwa. 
                    Sebesar 50% gangguan jiwa berawal pada usia 14 tahun.

                    **JSON_OUTPUT:**
                    {
                    "entities": [
                        {
                        "name": "Kesehatan Jiwa",
                        "type": "Konsep_Abstrak",
                        "description": "kondisi dimana seorang individu dapat berkembang secara fisik, mental, spiritual, dan sosial."
                        },
                        {
                        "name": "Gangguan Jiwa",
                        "type": "Gangguan_Mental",
                        "description": "Sebuah kondisi yang memiliki karakteristik seperti kombinasi pikiran abnormal, dan dipengaruhi oleh faktor psikologis serta biologis."
                        },
                        {
                        "name": "Karakteristik Gangguan Jiwa",
                        "type": "Karakteristik",
                        "description": "kombinasi pikiran yang abnormal, emosi, dan persepsi."
                        },
                        {
                        "name": "Faktor Psikologis",
                        "type": "Faktor_Risiko",
                        "description": "Faktor yang dapat mengakibatkan stres, contohnya trauma."
                        },
                        {
                        "name": "Faktor Biologis",
                        "type": "Faktor_Risiko",
                        "description": "Faktor yang berkontribusi pada gangguan jiwa, contohnya genetik."
                        },
                        {
                        "name": "Stres",
                        "type": "Gejala",
                        "description": "Sebuah kondisi yang diakibatkan oleh faktor psikologis seperti trauma."
                        },
                        {
                        "name": "Statistik Onset Gangguan Jiwa",
                        "type": "Data_Statistik",
                        "description": "Sebesar 50% gangguan jiwa berawal pada usia 14 tahun."
                        }
                    ],
                    "relations": [
                        {
                        "source_entity": "Gangguan Jiwa",
                        "target_entity": "Karakteristik Gangguan Jiwa",
                        "name": "memiliki karakteristik",
                        "type": "Memiliki_Atribut"
                        },
                        {
                        "source_entity": "Faktor Psikologis",
                        "target_entity": "Stres",
                        "name": "mengakibatkan",
                        "type": "Menyebabkan"
                        },
                        {
                        "source_entity": "Faktor Psikologis",
                        "target_entity": "Gangguan Jiwa",
                        "name": "berkontribusi terhadap",
                        "type": "Berkontribusi_Pada"
                        },
                        {
                        "source_entity": "Faktor Biologis",
                        "target_entity": "Gangguan Jiwa",
                        "name": "berkontribusi terhadap",
                        "type": "Berkontribusi_Pada"
                        },
                        {
                        "source_entity": "Gangguan Jiwa",
                        "target_entity": "Statistik Onset Gangguan Jiwa",
                        "name": "memiliki data onset",
                        "type": "Memiliki_Atribut"
                        }
                    ]
                    }
                    """,
                    response_schema     = EntityRelationResponse,
                    response_mime_type  = "application/json"
            )

            content = types.Content(
                role="user",
                parts= [
                    types.Part.from_text(text=f"Dokumen: \n {text}")
                ]
            )

            response = self.client.models.generate_content(
                model = "gemini-2.5-flash",
                contents = content,
                config = config
            )

            res = response.parsed

            entities = getattr(res, "entities", None) or res.get("entities")
            relations = getattr(res, "relations", None) or res.get("relations")

            if entities is None or relations is None:
                logger.warning("LLM response missing expected fields")
                return EntityRelationResponse(entities=[], relations=[])
            
            for entity in entities:
                setattr(entity, "chunk_id", chunk_id)

            for relation in relations:
                setattr(relation, "chunk_id", chunk_id)

            logger.info(f"Extracted {len(entities)} entities and {len(relations)} relations from document")
            return EntityRelationResponse(entities=entities, relations=relations)
        except Exception as e:
            logger.error(f"Failed to extract entity relations: {e}")
            return EntityRelationResponse(entities=[], relations=[])

    async def get_embeddings(self, input: list[str], task: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
        """Generate Embeding given text"""
        try:
            MAX_BATCH = 100
            all_embeddings = []
            # Split into chunks of MAX_BATCH
            for i in range(0, len(input), MAX_BATCH):
                batch = input[i:i + MAX_BATCH]

                response = self.client.models.embed_content(
                    model="models/embedding-001",
                    contents=batch,
                    config=types.EmbedContentConfig(task_type=task)
                )

                batch_embeddings = [e.values for e in response.embeddings]
                all_embeddings.extend(batch_embeddings)

            return all_embeddings

        except Exception as e:
            print(f"[ERROR] Failed to get embeddings: {e}")
            return []

    async def generate_evaluation_dataset(self, doc: str, nodes: List[Entity], minimum: int = 10) -> list[EvaluationDataset]:
        """Generates the dataset using the Gemini model."""
        try:
            nodes_str = json.dumps([node.model_dump() for node in nodes], indent=2)
            few_shot_examples = """
            [
                {
                    "query": "Jantungku berdebar kencang dan rasanya sesak napas. Apa aku kena serangan panik?",
                    "query_label": "path_query",
                    "golden_nodes": ["Serangan Panik", "Detak Jantung Cepat", "Sesak Napas"],
                    "golden_answer": "Itu terdengar sangat menakutkan. Jantung berdebar dan kesulitan bernapas memang merupakan gejala khas dari serangan panik. Meskipun saya tidak bisa memberikan diagnosis, fokus pada pernapasan Anda bisa membantu saat ini. Coba tarik napas perlahan... dan hembuskan perlahan."
                },
                {
                    "query": "apa itu depresi?",
                    "query_label": "entity_query",
                    "golden_nodes": ["Depresi", "Anhedonia"],
                    "golden_answer": "Depresi adalah gangguan suasana hati yang menyebabkan perasaan sedih yang mendalam dan terus-menerus, serta kehilangan minat pada hal-hal yang biasanya Anda nikmati, atau yang disebut juga anhedonia."
                }
            ]
            """
            prompt = f"""
            Anda adalah seorang ahli pembuatan data, ditugaskan untuk membuat dataset evaluasi "Silver Standard" untuk chatbot kesehatan mental.
            Respons Anda HARUS berupa daftar kamus (list of dictionaries) dalam format JSON yang valid. Jangan tambahkan teks pengantar atau penjelasan di luar struktur JSON.

            **KONTEKS & ATURAN:**
            1.  **Sumber Kebenaran:** Anda HANYA boleh menggunakan informasi yang disediakan di bagian 'KONTEKS DOKUMEN' dan 'NODE KNOWLEDGE GRAPH' di bawah ini. Jangan gunakan pengetahuan eksternal.
            2.  **Node Knowledge Graph:** Bagian 'NODE KNOWLEDGE GRAPH' menyediakan daftar node yang tersedia beserta nama dan deskripsinya. Untuk 'golden_nodes', Anda HANYA boleh menggunakan 'name' dari node-node tersebut. Gunakan 'description' untuk memahami arti setiap node dan membuat pilihan yang lebih baik.
            3.  **Tugas:** Hasilkan minimal {minimum} atau lebih contoh evaluasi yang beragam dalam format JSON yang ditentukan.
            4.  **Keragaman Query:** Buat campuran `entity_query` (apa itu X?) dan `path_query` (bagaimana/mengapa X terkait dengan Y?).
            5.  **Gaya Kueri:** 'query' harus mencerminkan pertanyaan pengguna yang ingin mengetahui tentang suatu hal.
            5.  **Gaya Jawaban:** 'golden_answer' harus empatik, aman, dan sangat berdasarkan pada KONTEKS yang disediakan. Jawaban tidak boleh memberikan nasihat medis.

            ---
            **KONTEKS DOKUMEN:**
            {doc}
            ---
            **NODE KNOWLEDGE GRAPH:**
            {nodes_str}
            ---

            **CONTOH FEW-SHOT (Ikuti format dan gaya ini):**
            {few_shot_examples}
            ---

            **TUGAS ANDA:**
            Sekarang, hasilkan {minimum} contoh baru yang unik berdasarkan semua aturan dan konteks yang diberikan. Pastikan output Anda adalah sebuah list JSON tunggal.
            """

            config = types.GenerateContentConfig(
                response_schema=list[EvaluationDataset],
                response_mime_type= "application/json"
            )

            response = self.client.models.generate_content(
                model = "gemini-2.5-flash",
                contents = prompt,
                config = config
            )
            res = response.parsed
            
            return res
        except Exception as e:
            logger.error(f"Failed to generate evaluation dataset: {e}" )
            return []