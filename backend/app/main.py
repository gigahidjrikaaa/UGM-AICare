from fastapi import FastAPI
from app.routes import chat, twitter
from app.core.scheduler import start_scheduler

app = FastAPI(title="Aika - Mental Health AI Agent")

app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(twitter.router, prefix="/twitter", tags=["Twitter"])

# Start task scheduler
start_scheduler()

@app.get("/")
async def root():
    return {"message": "Aika Backend is Running!"}
