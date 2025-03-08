from fastapi import FastAPI
from app.routes import chat, twitter, memory

app = FastAPI(title="Aika - UGM AICare")

# Include routes
app.include_router(chat.router)
app.include_router(twitter.router)
app.include_router(memory.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Aika API"}
