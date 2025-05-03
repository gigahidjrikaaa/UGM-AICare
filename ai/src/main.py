from fastapi import FastAPI, Query
from contextlib import asynccontextmanager
import logging
import uvicorn
from neo4j import GraphDatabase, Driver

from config import Config as app_config

GraphDriver: Driver = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    logger.info("Application startup...")
    init_database()
    if GraphDriver:
        with GraphDriver.session() as session:
            session.execute_write(create_graph)
    yield
    # Code to run on shutdown
    logger.info("Application shutdown...")
    if GraphDriver:
        GraphDriver.close()
        logger.info("Neo4j connection closed.")


app = FastAPI(
  title="Alika AI Engine",
  description="AI Engine for Alika Chatbot",
  version="1.0.0",
  lifespan=lifespan
)

@app.router.get("/")
async def hello():
    return ({"message":"Hello Aika Here"})


@app.router.get("/get-answer")
async def get_answer(question: str = Query(..., description="User input/question")):
    keywords = ["depression", "anxiety", "insomnia", "cbt", "psychologist"]
    found = [k for k in keywords if k in question.lower()]

    if not found:
        return {"context": "No relevant mental health topics found."}

    context_result = ""
    with GraphDriver.session() as session:
        for term in found:
            ctx = session.execute_read(get_context, term)
            context_result += ctx

    return {
        "matched_terms": found,
        "graph_context": context_result.strip()
    }

def init_database():
    global GraphDriver
    try:
      print(app_config.neo4j_uri, app_config.neo4j_username, app_config.neo4j_password)
      GraphDriver = GraphDatabase.driver(app_config.neo4j_uri, auth=(app_config.neo4j_username, app_config.neo4j_password))
      logger.info("Connected to Neo4j Database")
    except Exception as e:
      logger.error(f"Couldn't Connect to Neo4j Database:s {e}")
    
def create_graph(tx):
    tx.run("""
        MERGE (d:Disorder {name: "Depression", desc: "A mood disorder causing persistent sadness."})
        MERGE (a:Disorder {name: "Anxiety", desc: "A condition marked by excessive fear or worry."})
        MERGE (i:Symptom {name: "Insomnia", desc: "Difficulty falling or staying asleep."})
        MERGE (t:Treatment {name: "CBT", desc: "Cognitive Behavioral Therapy, a common treatment."})
        MERGE (p:Professional {name: "Psychologist", desc: "A professional providing therapy."})

        MERGE (d)-[:HAS_SYMPTOM]->(i)
        MERGE (a)-[:HAS_SYMPTOM]->(i)
        MERGE (d)-[:TREATED_BY]->(t)
        MERGE (a)-[:TREATED_BY]->(t)
        MERGE (t)-[:PROVIDED_BY]->(p)
    """)

# === RETRIEVE GRAPH CONTEXT FOR ENTITY ===
def get_context(tx, term):
    query = """
    MATCH (n)-[r]-(m)
    WHERE toLower(n.name) CONTAINS toLower($term)
    RETURN n.name AS node, n.desc AS node_desc, type(r) AS relation, m.name AS related, m.desc AS related_desc
    LIMIT 10
    """
    result = tx.run(query, term=term)
    context = ""
    for record in result:
        context += f"{record['node']}: {record['node_desc']}\n"
        context += f"→ {record['relation']} → {record['related']}: {record['related_desc']}\n\n"
    return context

def start():
    port = int(app_config.port)
    uvicorn.run(app=app, host="0.0.0.0", port=port)
# For Render deployment
if __name__ == "__main__":
    start()



    