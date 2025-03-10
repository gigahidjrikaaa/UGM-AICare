# UGM-AICare Backend

## Project Description

UGM-AICare is a mental health AI assistant aimed at providing supportive conversations and resources for users experiencing mental health challenges. The backend supports the core functionality of the AI chatbot, user management, conversation history tracking, and sentiment analysis.

The system utilizes a large language model (Llama 3.3 70B via Together.ai) to provide empathetic responses in conversational Indonesian, with a focus on mental health support.

## Features

- **AI Chatbot**: Interactive conversations with a mental health-focused AI assistant
- **User Management**: User authentication and profile management
- **Conversation Memory**: Storage of conversation history for context-aware responses
- **Sentiment Analysis**: Tracking user sentiment for mental health monitoring

## Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+)
- **Database**: PostgreSQL (via SQLAlchemy ORM)
- **Memory Storage**: Redis (with in-memory fallback)
- **LLM Provider**: Together.ai (Meta Llama 3.3 70B Instruct Turbo Free)
- **Authentication**: JWT token-based authentication
- **API Documentation**: Swagger UI (auto-generated)
- **Background Tasks**: Celery (optional for async processing)

## Project Structure

```
backend/
│
├── app/
│   ├── core/
│   │   ├── llm.py         # LLM integration with Together.ai
│   │   └── memory.py      # Memory management for conversation history
│   │
│   ├── routes/
│   │   ├── chat.py        # Chat endpoints
│   │   └── users.py       # User management endpoints
│   │
│   ├── models.py          # SQLAlchemy database models
│   └── main.py            # FastAPI application entry point
│
├── database.py            # Database connection and session management
├── config.py              # Configuration settings
├── migrations/            # Alembic migrations
├── logs/                  # Application logs
├── test/                  # Test scripts and fixtures
│   └── test_chat_1.py     # Test for chat functionality
│
├── requirements.txt       # Python dependencies
└── .env                   # Environment variables (not versioned)
```

## Prerequisites

- Python 3.9 or higher
- PostgreSQL
- Redis (optional, falls back to in-memory storage)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YourUsername/UGM-AICare.git
   cd UGM-AICare/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```
   # Database configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=aicare_db
   DB_USER=your_db_username
   DB_PASSWORD=your_db_password
   DATABASE_URL=postgresql://your_db_username:your_db_password@localhost:5432/aicare_db

   # API settings
   API_SECRET_KEY=your_secret_key_here
   API_DEBUG_MODE=True
   TOGETHER_API_KEY=your_together_api_key_here

   # Redis configuration (optional)
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

5. Set up the database:
   ```bash
   # Create the database
   createdb aicare_db
   
   # Run migrations
   alembic upgrade head
   ```

## Running the Application

1. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

2. The API will be available at `http://127.0.0.1:8000`
3. API documentation will be available at `http://127.0.0.1:8000/docs`

## Testing

Run the test script to check if the chat functionality is working:

```bash
python test/test_chat_1.py
```

## API Endpoints

### Chat

- **POST** `/chat/` - Send a message to the AI assistant
  - Request Body:
    ```json
    {
      "user_id": "string",
      "message": "string"
    }
    ```
  - Response:
    ```json
    {
      "response": "string"
    }
    ```

### Memory (if implemented)

- **GET** `/memory/history/{user_id}` - Get conversation history
- **POST** `/memory/conversation` - Save a conversation entry

## Configuration Options

- **LLM Provider**: Currently using Together.ai's Llama 3.3 70B model
- **Memory Storage**: Uses Redis by default with in-memory fallback
- **Debug Mode**: Set `API_DEBUG_MODE=True` for detailed logs

## Troubleshooting

### Redis Connection Issues

If you encounter Redis connection errors:
1. Ensure Redis server is running (`redis-server`)
2. Check if Redis is accessible (`redis-cli ping`)
3. The application will fall back to in-memory storage if Redis is unavailable

### API Key Issues

If Together.ai API requests fail:
1. Verify your API key in the `.env` file
2. Ensure you have sufficient quota for API calls
3. Check the format of the API key (should be a long string without quotes)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) for the web framework
- [Together.ai](https://www.together.ai) for LLM API access
- [Meta's Llama 3.3 70B](https://ai.meta.com/llama/) for the underlying language model

Similar code found with 2 license types