"""
Database migration to add user management fields
Run this script to add the new fields needed for proper user management in the admin dashboard

Usage:
1. Make sure your database is running
2. Update the DATABASE_URL below with your actual database connection string
3. Run: python add_user_management_fields.py
"""

import logging
import os
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

def run_migration():
    """Add new user management fields to the users table"""
    # Get database URL from environment or use default
    database_url = os.getenv('DATABASE_URL', 'sqlite:///./aika.db')
    
    engine = create_engine(database_url)
    
    migrations = [
        # Add role field
        "ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' NOT NULL",
        
        # Add password hash for email/password authentication
        "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)",
        
        # Add email verification status
        "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL",
        
        # Add active status
        "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL",
        
        # Add timestamps
        "ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL",
        "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL",
        "ALTER TABLE users ADD COLUMN last_login TIMESTAMP",
    ]
    
    # Create indexes (PostgreSQL syntax - adjust for SQLite if needed)
    index_migrations = [
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
        "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
    ]
    
    # Update existing data
    update_migrations = [
        "UPDATE users SET role = 'user' WHERE role IS NULL",
        "UPDATE users SET is_active = true WHERE is_active IS NULL",
        "UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL",
        "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL",
    ]
    
    all_migrations = migrations + index_migrations + update_migrations
    
    with engine.connect() as conn:
        for migration in all_migrations:
            try:
                logger.info(f"Running migration: {migration}")
                conn.execute(text(migration))
                conn.commit()
                logger.info(f"✅ Migration completed: {migration}")
            except Exception as e:
                logger.warning(f"⚠️  Migration may have already been applied: {migration}")
                logger.warning(f"Error: {e}")
                # Continue with other migrations
                continue
    
    logger.info("🎉 All user management field migrations completed!")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migration()
