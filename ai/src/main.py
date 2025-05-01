from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging
import uvicorn

import config as app_config

logger = logging.getLogger(__name__)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    logger.info("Application startup...")
    yield
    # Code to run on shutdown
    logger.info("Application shutdown...")


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
async def get_answer():
    return({
        "message": "Hii, this endpoint is under development"
    })

def start():
    port = int(app_config.Config.port)
    uvicorn.run(app=app, host="0.0.0.0", port=port, reload=False)
# For Render deployment
if __name__ == "__main__":
    start()
    