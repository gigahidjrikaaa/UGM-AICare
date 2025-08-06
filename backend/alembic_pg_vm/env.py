import os
import sys
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig

try:
    from alembic import context # type: ignore
except ImportError as e:
    raise ImportError(
        "Alembic package is not installed. Please install it using: pip install alembic"
    ) from e

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sends SCRIPT_LOCATION to the config file...
fileConfig(config.config_file_name)

# Add your model's MetaData object here
# for 'autogenerate' support
target_metadata = None

# Add the app directory to the Python path so we can import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    # Import Base from the correct location in the database module
    from app.database import Base
    # Import all models to register them with Base.metadata
    
    # Import agent models first
    import app.models.agents  # This imports all agent models from the models/ directory
    
    # Import main models directly from the models.py file using importlib
    import importlib.util
    import os
    models_file_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'models.py')
    spec = importlib.util.spec_from_file_location("main_models", models_file_path)
    if spec and spec.loader:
        main_models = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(main_models)
    
    target_metadata = Base.metadata
except ImportError as e:
    print(f"Warning: Could not import models: {e}")
    target_metadata = None

# Set the sqlalchemy.url from the DATABASE_URL environment variable
# This is the crucial part for Dockerized setup
def get_url():
    """Get database URL for Alembic migrations, converting asyncpg to standard PostgreSQL format"""
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        # Convert asyncpg URLs to standard PostgreSQL format for Alembic
        # Alembic can work with asyncpg URLs, but we'll use the standard format for compatibility
        if database_url.startswith("postgresql+asyncpg://"):
            return database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        elif database_url.startswith("postgresql://"):
            # Add explicit psycopg2 driver for standard postgresql URLs
            return database_url.replace("postgresql://", "postgresql+psycopg2://")
        elif database_url.startswith("sqlite+aiosqlite://"):
            return database_url.replace("sqlite+aiosqlite://", "sqlite://")
        return database_url
    return config.get_main_option("sqlalchemy.url")

config.set_main_option('sqlalchemy.url', get_url())

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
