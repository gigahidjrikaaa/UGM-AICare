from fastapi import APIRouter, Request, Depends, HTTPException, status  # type: ignore
from fastapi.responses import HTMLResponse, JSONResponse    # type: ignore
from fastapi.templating import Jinja2Templates  # type: ignore
import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from app.schemas import EndpointDoc, EndpointExample, ModuleDoc

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

# Routes
@router.get("/", response_class=HTMLResponse if templates else JSONResponse)
async def api_documentation(request: Request):
    """Main API documentation page"""
    if templates:
        return templates.TemplateResponse("docs/index.html", {"request": request, "api_docs": API_DOCS})
    else:
        return {
            "title": "UGM-AICare API Documentation",
            "description": "API documentation for the UGM-AICare mental health assistant",
            "modules": [details for details in API_DOCS.values()],
            "note": "For a better documentation experience, install Jinja2 and create HTML templates"
        }

@router.get("/modules/{module_name}")
async def module_documentation(request: Request, module_name: str):
    """Documentation for a specific API module"""
    if module_name not in API_DOCS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documentation for module '{module_name}' not found"
        )
    
    module = API_DOCS[module_name]
    
    if templates:
        return templates.TemplateResponse(
            "docs/module.html", 
            {"request": request, "module": module}
        )
    else:
        return module

@router.get("/endpoints/{module_name}/{endpoint_id}")
async def endpoint_documentation(request: Request, module_name: str, endpoint_id: int):
    """Documentation for a specific API endpoint"""
    if module_name not in API_DOCS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module '{module_name}' not found"
        )
    
    module = API_DOCS[module_name]
    
    if endpoint_id < 0 or endpoint_id >= len(module["endpoints"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint ID '{endpoint_id}' not found in module '{module_name}'"
        )
    
    endpoint = module["endpoints"][endpoint_id]
    
    if templates:
        return templates.TemplateResponse(
            "docs/endpoint.html", 
            {"request": request, "module": module, "endpoint": endpoint}
        )
    else:
        return endpoint

@router.get("/examples/")
async def api_examples():
    """Provide code examples for using the API"""
    examples = {
        "python": {
            "title": "Python Example",
            "code": """
import requests
import json

# Base URL for the API
API_URL = "http://localhost:8000"

# Function to send a message to the AI
def send_message(user_id, message):
    response = requests.post(
        f"{API_URL}/chat/",
        json={"user_id": user_id, "message": message}
    )
    
    if response.status_code == 200:
        return response.json()["response"]
    else:
        return f"Error: {response.status_code} - {response.text}"

# Example usage
user_id = "user123"
message = "Halo, saya sedang merasa cemas tentang ujian besok."
ai_response = send_message(user_id, message)
print(f"AI: {ai_response}")
"""
        },
        "javascript": {
            "title": "JavaScript Example",
            "code": """
// Function to send a message to the AI
async function sendMessage(userId, message) {
  try {
    const response = await fetch('http://localhost:8000/chat/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        message: message,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${data.detail || 'Unknown error'}`);
    }
    
    return data.response;
  } catch (error) {
    console.error('Failed to send message:', error);
    return `Error: ${error.message}`;
  }
}

// Example usage
const userId = 'user123';
const message = 'Halo, saya sedang merasa cemas tentang ujian besok.';

sendMessage(userId, message)
  .then(aiResponse => {
    console.log(`AI: ${aiResponse}`);
  });
"""
        }
    }
    
    return examples

@router.get("/guide")
async def api_guide(request: Request):
    """Comprehensive guide on how to use the API"""
    guide = {
        "title": "UGM-AICare API Guide",
        "introduction": "This guide explains how to effectively use the UGM-AICare API for mental health support applications.",
        "authentication": "Currently, the API uses simple user IDs for tracking conversations. More robust authentication will be added in future versions.",
        "rate_limits": "Please limit requests to no more than 60 per minute per user to ensure service quality for all users.",
        "best_practices": [
            "Store user_id securely and consistently to maintain conversation context",
            "Handle API errors gracefully to ensure a good user experience",
            "Consider the user's language preferences when displaying AI responses",
            "Ensure privacy and confidentiality of all mental health conversations"
        ],
        "sections": [
            {
                "title": "Getting Started",
                "content": "To start using the API, make a POST request to /chat/ with a user_id and message. The API will respond with the AI assistant's reply."
            },
            {
                "title": "Conversation Flow",
                "content": "Each message is stored with context, allowing the AI to remember previous interactions with the same user_id. This creates a continuous, coherent conversation experience."
            },
            {
                "title": "Email Integration",
                "content": "The email API allows sending scheduled updates or resources to users. Create templates first, then use them to send personalized emails."
            }
        ],
        "common_issues": [
            {
                "issue": "AI doesn't remember previous context",
                "solution": "Ensure you're using the same user_id for all messages from the same user"
            },
            {
                "issue": "Slow response times",
                "solution": "The AI may take longer to respond during high traffic periods. Implement appropriate loading states in your UI."
            }
        ]
    }
    
    if templates:
        return templates.TemplateResponse("docs/guide.html", {"request": request, "guide": guide})
    else:
        return guide

@router.get("/openapi.json")
async def get_openapi_spec():
    """Return a simplified OpenAPI specification for the API"""
    # This would normally be generated automatically by FastAPI
    # This is a simplified version for the custom docs route
    openapi_spec = {
        "openapi": "3.0.2",
        "info": {
            "title": "UGM-AICare API",
            "description": "API for UGM-AICare mental health assistant",
            "version": "0.1.0"
        },
        "paths": {
            "/chat/": {
                "post": {
                    "summary": "Send a message to Aika",
                    "operationId": "chat_chat__post",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ChatRequest"
                                }
                            }
                        },
                        "required": True
                    },
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/ChatResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "components": {
            "schemas": {
                "ChatRequest": {
                    "title": "ChatRequest",
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "title": "User ID",
                            "type": "string"
                        },
                        "message": {
                            "title": "Message",
                            "type": "string"
                        }
                    },
                    "required": ["user_id", "message"]
                },
                "ChatResponse": {
                    "title": "ChatResponse",
                    "type": "object",
                    "properties": {
                        "response": {
                            "title": "Response",
                            "type": "string"
                        }
                    }
                }
            }
        }
    }
    
    # Add other endpoints from our API_DOCS structure
    for module_name, module in API_DOCS.items():
        if module_name == "general":
            continue
            
        for endpoint in module["endpoints"]:
            path = endpoint["path"]
            method = endpoint["method"].lower()
            
            if path not in openapi_spec["paths"]:
                openapi_spec["paths"][path] = {}
                
            openapi_spec["paths"][path][method] = {
                "summary": endpoint["summary"],
                "description": endpoint["description"],
                "responses": {}
            }
            
            # Add responses
            for status_code, response_details in endpoint["responses"].items():
                openapi_spec["paths"][path][method]["responses"][status_code] = {
                    "description": response_details.get("description", "")
                }
    
    return openapi_spec