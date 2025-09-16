
from langchain_core.tools import tool

@tool
def resource_lookup(classification: str) -> list[dict]:
    """Looks up resources based on the classification."""
    resources = {
        "high": [
            {
                "name": "UGM Crisis Line",
                "phone": "+62 812-2877-3800",
                "description": "24/7 crisis support for UGM students."
            },
            {
                "name": "Kemenkes SEJIWA",
                "phone": "119 ext. 8",
                "description": "National mental health counseling service."
            }
        ],
        "medium": [
            {
                "name": "Gadjah Mada Medical Center (GMC)",
                "phone": "+62 (0274) 551412",
                "description": "Provides psychological counseling."
            },
            {
                "name": "Faculty of Psychology Counseling Services (PPM)",
                "phone": "+62 (0274) 550435",
                "description": "Professional counseling with licensed psychologists."
            }
        ],
        "low": [
            {
                "name": "Health Promoting University (HPU UGM)",
                "website": "hpu.ugm.ac.id",
                "description": "Focuses on holistic health services and workshops."
            }
        ]
    }
    return resources.get(classification.lower(), [])
