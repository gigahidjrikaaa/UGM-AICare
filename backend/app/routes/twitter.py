from fastapi import APIRouter
import requests
from app.config import TWITTER_BEARER_TOKEN

router = APIRouter()

@router.get("/latest")
async def fetch_latest_tweets():
    url = "https://api.twitter.com/2/tweets/search/recent?query=from:UGM_fess"
    headers = {"Authorization": f"Bearer {TWITTER_BEARER_TOKEN}"}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return {"error": "Failed to fetch tweets"}
