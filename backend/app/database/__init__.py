from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Determine which database to use based on environment
# if os.getenv("APP_ENV", "development") == "production":
#     # Use PostgreSQL in production
#     DATABASE_URL = os.getenv("DATABASE_URL")
#     if DATABASE_URL is None:
#         logger.error("DATABASE_URL environment variable not set for production.")
#         raise ValueError("DATABASE_URL environment variable not set for production.")
#     engine = create_engine(DATABASE_URL)
# else:
#     # Use SQLite for development
#     DATABASE_URL = "sqlite:///./aika.db"
#     engine = create_engine(
#         DATABASE_URL, connect_args={"check_same_thread": False}
#     )

# Determine the database URL from environment variables (should be using Dockerized setup)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aika.db")
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgresql+psycopg2://"):
    # Use PostgreSQL
    engine = create_engine(DATABASE_URL)
else:
    # Use SQLite for development
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )

logger.info(f"Using database: {DATABASE_URL}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized with {DATABASE_URL}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()