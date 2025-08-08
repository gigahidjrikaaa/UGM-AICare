from fastapi import APIRouter, Request, Depends, HTTPException, status  # type: ignore
from fastapi.responses import HTMLResponse, JSONResponse    # type: ignore
from fastapi.templating import Jinja2Templates  # type: ignore
import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import ValidationError
from app.schemas.docs import ModuleDoc

# Configure router
router = APIRouter(prefix="/docs", tags=["documentation"])

# Try to load templates if available, otherwise we'll use JSON responses
try:
    templates_dir = Path(__file__).parent.parent / "templates"
    templates = Jinja2Templates(directory=str(templates_dir))
except Exception:
    templates = None

# Local API documentation data
API_DOCS = {
    "chat": {
        "name": "Chat API",
        "description": "Endpoints for interacting with the Aika AI chatbot",
        "endpoints": [
            {
                "path": "/chat/",
                "method": "POST",
                "summary": "Send a message to Aika",
                "description": "Send a message to the AI and receive a supportive response",
                "parameters": [],
                "request_body": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "user_id": {"type": "string", "description": "Unique identifier for the user"},
                                    "message": {"type": "string", "description": "The user's message"}
                                },
                                "required": ["user_id", "message"]
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Successful response from the AI",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "response": {"type": "string", "description": "AI's response to the user's message"}
                                    }
                                }
                            }
                        }
                    },
                    "500": {
                        "description": "Server error",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "error": {"type": "string", "description": "Error message"}
                                    }
                                }
                            }
                        }
                    }
                },
                "examples": [
                    {
                        "request": {
                            "user_id": "user123",
                            "message": "Halo, saya merasa sedih hari ini"
                        },
                        "response": {
                            "response": "Hai, maaf mendengar kamu sedang merasa sedih. Bisa cerita lebih lanjut tentang apa yang membuatmu merasa begitu? Aku di sini untuk mendengarkan."
                        },
                        "description": "Basic conversation example"
                    }
                ]
            },
            {
                "path": "/chat/history/{user_id}",
                "method": "GET",
                "summary": "Get conversation history",
                "description": "Retrieve the conversation history for a specific user",
                "parameters": [
                    {
                        "name": "user_id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"},
                        "description": "Unique identifier for the user"
                    },
                    {
                        "name": "limit",
                        "in": "query",
                        "required": False,
                        "schema": {"type": "integer", "default": 50},
                        "description": "Maximum number of messages to return"
                    }
                ],
                "responses": {
                    "200": {
                        "description": "List of messages in the conversation",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "role": {"type": "string", "enum": ["user", "assistant"]},
                                            "content": {"type": "string"},
                                            "timestamp": {"type": "string", "format": "date-time"}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        "description": "User not found",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "detail": {"type": "string"}
                                    }
                                }
                            }
                        }
                    }
                },
                "examples": []
            }
        ]
    },
    "email": {
        "name": "Email API",
        "description": "Endpoints for managing email templates and sending emails",
        "endpoints": [
            {
                "path": "/email/templates/",
                "method": "POST",
                "summary": "Create email template",
                "description": "Create a new email template for sending emails",
                "request_body": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string", "description": "Template name"},
                                    "subject": {"type": "string", "description": "Email subject"},
                                    "body": {"type": "string", "description": "Email body in HTML format"},
                                    "description": {"type": "string", "description": "Optional template description"}
                                },
                                "required": ["name", "subject", "body"]
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": "Template created successfully",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "id": {"type": "integer"},
                                        "name": {"type": "string"},
                                        "subject": {"type": "string"},
                                        "body": {"type": "string"},
                                        "description": {"type": "string"},
                                        "created_at": {"type": "string", "format": "date-time"}
                                    }
                                }
                            }
                        }
                    }
                },
                "examples": []
            },
            {
                "path": "/email/send/",
                "method": "POST",
                "summary": "Send email",
                "description": "Send an email using a template",
                "request_body": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "template_id": {"type": "integer", "description": "ID of the template to use"},
                                    "recipients": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "email": {"type": "string", "format": "email"},
                                                "name": {"type": "string"}
                                            },
                                            "required": ["email"]
                                        }
                                    },
                                    "schedule_time": {"type": "string", "format": "date-time", "description": "Optional time to schedule the email"},
                                    "template_variables": {"type": "object", "description": "Variables to replace in the template"}
                                },
                                "required": ["template_id", "recipients"]
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Email sent or scheduled",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "message": {"type": "string"}
                                    }
                                }
                            }
                        }
                    },
                    "404": {
                        "description": "Template not found"
                    }
                },
                "examples": []
            }
        ]
    },
    "general": {
        "name": "General Information",
        "description": "General API information and usage guidelines",
        "endpoints": [
            {
                "path": "/",
                "method": "GET",
                "summary": "API root",
                "description": "API welcome message and status check",
                "parameters": [],
                "responses": {
                    "200": {
                        "description": "Welcome message",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "message": {"type": "string"}
                                    }
                                }
                            }
                        }
                    }
                },
                "examples": []
            }
        ]
    }
}

# Validate and parse the API_DOCS data using Pydantic models
parsed_docs: Dict[str, ModuleDoc] = {}
for module_name, module_data in API_DOCS.items():
    try:
        parsed_docs[module_name] = ModuleDoc.model_validate(module_data)
    except ValidationError as e:
        # This provides detailed feedback during development if the API_DOCS structure is incorrect.
        print(f"Error validating documentation for module '{module_name}': {e}")
        # Depending on strictness, you might want to raise an exception to halt startup.
        # raise e

# Routes
@router.get("/", response_class=HTMLResponse if templates else JSONResponse)
async def api_documentation(request: Request):
    """Main API documentation page"""
    if templates:
        # Pass the parsed Pydantic objects to the template.
        # The template can then access attributes like `module.name`, `endpoint.path`, etc.
        return templates.TemplateResponse("docs/index.html", {"request": request, "api_docs": parsed_docs})
    else:
        # Convert Pydantic objects back to dicts for a consistent JSON response.
        return {
            "title": "UGM-AICare API Documentation",
            "description": "API documentation for the UGM-AICare mental health assistant",
            "modules": [details.model_dump() for details in parsed_docs.values()],
            "note": "For a better documentation experience, install Jinja2 and create HTML templates"
        }