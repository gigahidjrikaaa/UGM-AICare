
from langchain_core.tools import tool
import httpx

@tool
def db_resource_lookup(classification: str) -> list[dict]:
    """Looks up resources from the database based on the classification."""
    try:
        # In a real application, you would pass the API URL and any necessary
        # authentication headers to the tool.
        api_url = "http://backend:8000/api/v1/admin/content-resources"
        response = httpx.get(api_url)
        response.raise_for_status()
        resources = response.json()["items"]

        # Filter resources based on the classification.
        # This is a simple example; you could use more sophisticated filtering logic.
        # For example, you could add a 'category' or 'tags' field to the ContentResource
        # model and filter on that.
        return [r for r in resources if classification.lower() in r["title"].lower()]
    except Exception as e:
        print(f"Error looking up resources in the database: {e}")
        return []
