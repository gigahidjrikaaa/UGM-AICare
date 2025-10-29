"""
External Context Tools - Real-World Information

This module provides tools for fetching external information to enable
more natural, contextually-aware conversations. Includes web search,
news, weather, and academic calendar integration.

Tools:
- web_search: Privacy-friendly web search via DuckDuckGo
- get_mental_health_news: Recent mental health news (Indonesia focus)
- get_weather: Current weather for mood context
- get_academic_calendar: UGM exam periods and holidays

Privacy: All queries are sanitized to remove PII before external API calls.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import httpx
import re
import os
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.shared.tools import tool_registry

import logging

logger = logging.getLogger(__name__)

# Constants
MAX_SEARCH_RESULTS = 5
MAX_NEWS_ARTICLES = 5
SEARCH_TIMEOUT = 10.0
NEWS_TIMEOUT = 10.0
WEATHER_TIMEOUT = 5.0


def sanitize_query(query: str) -> str:
    """
    Sanitize query to remove potential PII before external API calls.
    
    Removes:
    - Email addresses
    - Phone numbers
    - Specific names (common Indonesian names)
    - Student IDs
    
    Args:
        query: Original search query
        
    Returns:
        Sanitized query safe for external APIs
    """
    # Remove email addresses
    query = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', query)
    
    # Remove phone numbers (Indonesian formats)
    query = re.sub(r'(\+62|0)[0-9]{9,12}', '[PHONE]', query)
    
    # Remove potential student IDs (numeric patterns)
    query = re.sub(r'\b\d{8,15}\b', '[ID]', query)
    
    # Remove common Indonesian names (basic list - expand as needed)
    common_names = ['Budi', 'Siti', 'Ahmad', 'Rina', 'Dewi', 'Agus', 'Sri', 'Eko']
    for name in common_names:
        query = re.sub(rf'\b{name}\b', '[NAME]', query, flags=re.IGNORECASE)
    
    return query.strip()


async def web_search(
    db: AsyncSession,
    query: str,
    max_results: int = MAX_SEARCH_RESULTS
) -> Dict[str, Any]:
    """
    Privacy-friendly web search using DuckDuckGo Instant Answer API.
    
    Searches the web for general information without tracking.
    Query is sanitized to remove PII before searching.
    
    Args:
        query: Search query (will be sanitized)
        max_results: Maximum number of results (default 5, max 5)
        
    Returns:
        Dict with search results or error
    """
    try:
        if max_results > MAX_SEARCH_RESULTS:
            max_results = MAX_SEARCH_RESULTS
            
        # Sanitize query for privacy
        original_query = query
        query = sanitize_query(query)
        
        if query != original_query:
            logger.warning(f"⚠️ Query sanitized: '{original_query}' → '{query}'")
        
        # Use DuckDuckGo Instant Answer API (no API key needed)
        url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_html": 1,
            "skip_disambig": 1
        }
        
        async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
        # Parse results
        results = []
        
        # Add abstract if available
        if data.get("Abstract"):
            results.append({
                "title": data.get("Heading", "Overview"),
                "snippet": data.get("Abstract"),
                "url": data.get("AbstractURL"),
                "source": data.get("AbstractSource", "DuckDuckGo")
            })
        
        # Add related topics
        for topic in data.get("RelatedTopics", [])[:max_results - len(results)]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("FirstURL", "").split("/")[-1].replace("_", " "),
                    "snippet": topic.get("Text"),
                    "url": topic.get("FirstURL"),
                    "source": "DuckDuckGo"
                })
        
        logger.info(f"✅ Web search completed: {len(results)} results for '{query}'")
        
        return {
            "success": True,
            "query": query,
            "original_query": original_query if query != original_query else None,
            "total_results": len(results),
            "results": results
        }
        
    except httpx.TimeoutException:
        logger.error(f"❌ Web search timeout for query: {query}")
        return {
            "success": False,
            "error": "Search request timed out",
            "query": query
        }
    except Exception as e:
        logger.error(f"❌ Error in web search for '{query}': {e}")
        return {
            "success": False,
            "error": str(e),
            "query": query
        }


async def get_mental_health_news(
    db: AsyncSession,
    country: str = "Indonesia",
    limit: int = MAX_NEWS_ARTICLES
) -> Dict[str, Any]:
    """
    Get recent mental health news articles.
    
    Fetches news about mental health, counseling, and student wellbeing.
    Useful for contextual awareness in conversations.
    
    Note: Requires NEWS_API_KEY in environment (optional feature).
    Falls back to curated resources if API unavailable.
    
    Args:
        country: Country code (default "Indonesia")
        limit: Maximum number of articles (default 5, max 5)
        
    Returns:
        Dict with news articles or error
    """
    try:
        if limit > MAX_NEWS_ARTICLES:
            limit = MAX_NEWS_ARTICLES
            
        news_api_key = os.getenv('NEWS_API_KEY', None)
        
        if not news_api_key:
            logger.info("ℹ️ NEWS_API_KEY not configured, returning curated resources")
            # Return curated fallback resources
            return {
                "success": True,
                "source": "curated",
                "country": country,
                "total_articles": 2,
                "articles": [
                    {
                        "title": "Mental Health Resources for Indonesian Students",
                        "description": "Comprehensive guide to mental health support available for university students in Indonesia.",
                        "url": "https://www.who.int/indonesia/news",
                        "published_at": datetime.utcnow().isoformat(),
                        "source": "WHO Indonesia"
                    },
                    {
                        "title": "Campus Counseling Services Awareness Campaign",
                        "description": "Universities across Indonesia are promoting mental health awareness and counseling services.",
                        "url": "https://ugm.ac.id/",
                        "published_at": datetime.utcnow().isoformat(),
                        "source": "UGM Official"
                    }
                ]
            }
        
        # Use NewsAPI to fetch real articles
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": "mental health OR counseling OR student wellbeing",
            "language": "id" if country.lower() == "indonesia" else "en",
            "sortBy": "publishedAt",
            "pageSize": limit,
            "apiKey": news_api_key
        }
        
        async with httpx.AsyncClient(timeout=NEWS_TIMEOUT) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
        articles = []
        for article in data.get("articles", []):
            articles.append({
                "title": article.get("title"),
                "description": article.get("description"),
                "url": article.get("url"),
                "published_at": article.get("publishedAt"),
                "source": article.get("source", {}).get("name")
            })
        
        logger.info(f"✅ Retrieved {len(articles)} mental health news articles for {country}")
        
        return {
            "success": True,
            "source": "NewsAPI",
            "country": country,
            "total_articles": len(articles),
            "articles": articles
        }
        
    except httpx.TimeoutException:
        logger.error(f"❌ News API timeout for country: {country}")
        return {
            "success": False,
            "error": "News request timed out",
            "country": country
        }
    except Exception as e:
        logger.error(f"❌ Error fetching mental health news for {country}: {e}")
        return {
            "success": False,
            "error": str(e),
            "country": country
        }


async def get_weather(
    db: AsyncSession,
    location: str = "Yogyakarta"
) -> Dict[str, Any]:
    """
    Get current weather for mood context.
    
    Weather can affect mood and mental health. This provides context
    for more empathetic conversations (e.g., "It's raining today...").
    
    Note: Uses Open-Meteo API (free, no API key required).
    
    Args:
        location: City name (default "Yogyakarta")
        
    Returns:
        Dict with weather data or error
    """
    try:
        # Geocoding to get coordinates (Open-Meteo Geocoding API)
        geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
        geocoding_params = {
            "name": location,
            "count": 1,
            "language": "id",
            "format": "json"
        }
        
        async with httpx.AsyncClient(timeout=WEATHER_TIMEOUT) as client:
            geo_response = await client.get(geocoding_url, params=geocoding_params)
            geo_response.raise_for_status()
            geo_data = geo_response.json()
        
        if not geo_data.get("results"):
            logger.warning(f"⚠️ Location not found: {location}")
            return {
                "success": False,
                "error": f"Location '{location}' not found",
                "location": location
            }
        
        # Get coordinates
        result = geo_data["results"][0]
        latitude = result["latitude"]
        longitude = result["longitude"]
        city_name = result["name"]
        
        # Fetch weather data (Open-Meteo Weather API)
        weather_url = "https://api.open-meteo.com/v1/forecast"
        weather_params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
            "timezone": "Asia/Jakarta"
        }
        
        async with httpx.AsyncClient(timeout=WEATHER_TIMEOUT) as client:
            weather_response = await client.get(weather_url, params=weather_params)
            weather_response.raise_for_status()
            weather_data = weather_response.json()
        
        current = weather_data.get("current", {})
        
        # Map weather codes to descriptions (WMO Weather interpretation codes)
        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Slight snow",
            73: "Moderate snow",
            75: "Heavy snow",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail"
        }
        
        weather_code = current.get("weather_code", 0)
        weather_description = weather_codes.get(weather_code, "Unknown")
        
        logger.info(f"✅ Weather retrieved for {city_name}: {weather_description}")
        
        return {
            "success": True,
            "location": city_name,
            "temperature_celsius": current.get("temperature_2m"),
            "humidity_percent": current.get("relative_humidity_2m"),
            "weather_code": weather_code,
            "weather_description": weather_description,
            "wind_speed_kmh": current.get("wind_speed_10m"),
            "timestamp": current.get("time")
        }
        
    except httpx.TimeoutException:
        logger.error(f"❌ Weather API timeout for location: {location}")
        return {
            "success": False,
            "error": "Weather request timed out",
            "location": location
        }
    except Exception as e:
        logger.error(f"❌ Error fetching weather for {location}: {e}")
        return {
            "success": False,
            "error": str(e),
            "location": location
        }


async def get_academic_calendar(
    db: AsyncSession,
    university: str = "UGM"
) -> Dict[str, Any]:
    """
    Get academic calendar events (exam periods, holidays).
    
    Provides context about stressful academic periods that may
    affect student mental health (e.g., midterms, finals).
    
    Note: Currently returns static calendar. Future: scrape university websites.
    
    Args:
        university: University code (default "UGM")
        
    Returns:
        Dict with calendar events or error
    """
    try:
        # Static calendar for now (could be database-driven or scraped in future)
        # Typical UGM academic calendar patterns
        current_year = datetime.utcnow().year
        current_month = datetime.utcnow().month
        
        # Determine current semester
        if 2 <= current_month <= 7:
            semester = "Spring Semester"
            events = [
                {
                    "event": "Midterm Exams",
                    "start_date": f"{current_year}-04-01",
                    "end_date": f"{current_year}-04-14",
                    "description": "Mid-semester examination period",
                    "stress_level": "HIGH"
                },
                {
                    "event": "Final Exams",
                    "start_date": f"{current_year}-06-15",
                    "end_date": f"{current_year}-06-30",
                    "description": "End-of-semester examination period",
                    "stress_level": "VERY HIGH"
                },
                {
                    "event": "Summer Break",
                    "start_date": f"{current_year}-07-01",
                    "end_date": f"{current_year}-08-15",
                    "description": "Semester break and vacation",
                    "stress_level": "LOW"
                }
            ]
        else:
            semester = "Fall Semester"
            events = [
                {
                    "event": "Midterm Exams",
                    "start_date": f"{current_year}-10-15",
                    "end_date": f"{current_year}-10-28",
                    "description": "Mid-semester examination period",
                    "stress_level": "HIGH"
                },
                {
                    "event": "Final Exams",
                    "start_date": f"{current_year}-12-15",
                    "end_date": f"{current_year}-12-30",
                    "description": "End-of-semester examination period",
                    "stress_level": "VERY HIGH"
                },
                {
                    "event": "Winter Break",
                    "start_date": f"{current_year + 1}-01-01",
                    "end_date": f"{current_year + 1}-01-31",
                    "description": "Semester break and vacation",
                    "stress_level": "LOW"
                }
            ]
        
        # Filter to show only upcoming events
        today = datetime.utcnow().date()
        upcoming_events: List[Dict[str, Any]] = []
        for event in events:
            event_start = datetime.fromisoformat(event["start_date"]).date()
            if event_start >= today or (
                event_start <= today <= datetime.fromisoformat(event["end_date"]).date()
            ):
                # Add days_until field
                days_until = (event_start - today).days
                event_with_timing: Dict[str, Any] = {
                    **event,
                    "days_until": days_until,
                    "is_ongoing": days_until < 0
                }
                upcoming_events.append(event_with_timing)
        
        logger.info(f"✅ Academic calendar retrieved for {university}: {len(upcoming_events)} upcoming events")
        
        return {
            "success": True,
            "university": university,
            "current_semester": semester,
            "total_events": len(upcoming_events),
            "events": upcoming_events
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting academic calendar for {university}: {e}")
        return {
            "success": False,
            "error": str(e),
            "university": university
        }


# ============================================================================
# GEMINI FUNCTION CALLING SCHEMAS
# ============================================================================

web_search_schema = {
    "name": "web_search",
    "description": "Privacy-friendly web search using DuckDuckGo. Queries are sanitized to remove PII. Use for general information lookup.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query (will be sanitized to remove personal information)"
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of results to return (default 5, max 5)",
                "default": 5
            }
        },
        "required": ["query"]
    }
}

get_mental_health_news_schema = {
    "name": "get_mental_health_news",
    "description": "Get recent mental health news articles for contextual awareness. Helps conversations feel more connected to current events.",
    "parameters": {
        "type": "object",
        "properties": {
            "country": {
                "type": "string",
                "description": "Country to get news for (default 'Indonesia')",
                "default": "Indonesia"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of articles to return (default 5, max 5)",
                "default": 5
            }
        },
        "required": []
    }
}

get_weather_schema = {
    "name": "get_weather",
    "description": "Get current weather for mood context. Weather affects mood, use this for empathetic conversations (e.g., 'It's raining today...').",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "City name to get weather for (default 'Yogyakarta')",
                "default": "Yogyakarta"
            }
        },
        "required": []
    }
}

get_academic_calendar_schema = {
    "name": "get_academic_calendar",
    "description": "Get academic calendar events like exam periods and holidays. Provides context about stressful academic periods.",
    "parameters": {
        "type": "object",
        "properties": {
            "university": {
                "type": "string",
                "description": "University code (default 'UGM')",
                "default": "UGM"
            }
        },
        "required": []
    }
}


# ============================================================================
# REGISTER TOOLS WITH CENTRAL REGISTRY
# ============================================================================

tool_registry.register(
    name="web_search",
    func=web_search,
    schema=web_search_schema,
    category="external_context"
)

tool_registry.register(
    name="get_mental_health_news",
    func=get_mental_health_news,
    schema=get_mental_health_news_schema,
    category="external_context"
)

tool_registry.register(
    name="get_weather",
    func=get_weather,
    schema=get_weather_schema,
    category="external_context"
)

tool_registry.register(
    name="get_academic_calendar",
    func=get_academic_calendar,
    schema=get_academic_calendar_schema,
    category="external_context"
)

logger.info("🔧 Registered 4 external context tools in 'external_context' category")
