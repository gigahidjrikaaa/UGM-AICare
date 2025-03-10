from sqlalchemy import Column, Integer, DateTime
from datetime import datetime
import re
from sqlalchemy.ext.declarative import declared_attr

class BaseModel:
    """Base model class that provides common columns and functionality"""
    
    @declared_attr
    def __tablename__(cls):
        # Convert CamelCase to snake_case for table names
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', cls.__name__)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)