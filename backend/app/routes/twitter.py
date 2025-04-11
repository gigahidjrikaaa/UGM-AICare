from fastapi import APIRouter # type: ignore
import requests
import os
from dotenv import load_dotenv

load_dotenv()

TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

router = APIRouter()

@router.get("/latest")
async def fetch_latest_tweets():
    url = "https://api.twitter.com/2/tweets/search/recent?query=from:UGM_fess"
    headers = {"Authorization": f"Bearer {TWITTER_BEARER_TOKEN}"}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return {"error": "Failed to fetch tweets"}
