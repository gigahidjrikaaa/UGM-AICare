# UGM-AICare

## Mental Health Support AI Assistant

UGM-AICare is an AI-powered mental health support assistant developed by the Universitas Gadjah Mada team. It provides empathetic conversations and resources for individuals experiencing mental health challenges, primarily through social media interactions and direct messaging.

![UGM-AICare Logo](assets/logo.png)

## Project Overview

UGM-AICare delivers accessible mental health support through:

- **Twitter Integration**: Responds to mental health concerns on UGM_fess and other university-related accounts
- **Direct Messaging Support**: Provides private conversations for those seeking confidential assistance
- **Empathetic AI**: Uses advanced large language models fine-tuned for mental health support
- **Indonesian Language**: Primarily communicates in casual Indonesian with local cultural context

## Features

- **Empathetic Conversation**: Provides supportive, non-judgmental responses in a conversational tone
- **Resource Recommendations**: Suggests appropriate mental health resources and coping strategies
- **Crisis Detection**: Identifies potential crisis situations and offers appropriate guidance
- **Persistent Memory**: Maintains conversation context for more natural interactions
- **User Privacy**: Prioritizes data security and user confidentiality

## Tech Stack

### Frontend

- **Framework**: Next.js with TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Hooks
- **API Integration**: Fetch API

### Backend

- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (via SQLAlchemy)
- **Memory Storage**: Redis
- **Large Language Model**: Meta Llama 3.3 70B via Together.ai
- **Deployment**: Docker containers

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- Redis
- PostgreSQL
- Together.ai API key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-username/UGM-AICare.git
cd UGM-AICare
```

2. **Set up the backend**

```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
pip install -r requirements.txt
```

3. **Configure environment variables**

```bash
# Create .env file in backend directory with:
DATABASE_URL=postgresql://username:password@localhost:5432/aicare_db
TOGETHER_API_KEY=your_together_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
```

4. **Set up the frontend**

```bash
cd ../frontend
npm install
```

5. **Create frontend environment variables**

```bash
# Create .env.local in frontend directory with:
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running the Application

You can use our convenience script to start both backend and frontend:

```bash
# From project root
python start_aicare.py
```

Or start each component separately:

**Backend**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm run dev
```

Then access:

- Frontend: <http://localhost:3000>
- API documentation: <http://localhost:8000/docs>

## Project Structure

```
UGM-AICare/
├── backend/               # FastAPI application
│   ├── app/               # Application code
│   │   ├── core/          # Core functionality
│   │   │   ├── llm.py     # LLM integration
│   │   │   └── memory.py  # Conversation memory
│   │   ├── routes/        # API endpoints
│   │   ├── models.py      # Database models
│   │   └── main.py        # Application entry point
│   ├── logs/              # Log files
│   └── requirements.txt   # Python dependencies
│
├── frontend/              # Next.js application 
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   └── app/           # Next.js pages
│   └── package.json       # Node dependencies
│
└── start_aicare.py        # Convenience startup script
```

## Contributing

We welcome contributions to UGM-AICare! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Future Roadmap

- Integration with additional social media platforms
- Advanced sentiment analysis for better response customization
- Mobile application development
- User account system for personalized support
- Expanded resource database for Indonesian mental health services

## About the Team

UGM-AICare is developed by students and faculty from the Universitas Gadjah Mada with expertise in artificial intelligence, psychology, and healthcare.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Together.ai](https://www.together.ai/) for LLM API access
- [Meta's Llama 3.3](https://ai.meta.com/llama/) for the underlying language model
- The UGM community for feedback and support

---

For questions or support, please contact [team@ugm-aicare.example.com](mailto:team@ugm-aicare.example.com).

Similar code found with 1 license type
