"""Pytest configuration for test suite.

This module configures pytest for the UGM-AICare backend test suite,
including import path setup and common fixtures.
"""
import sys
from pathlib import Path

# Add backend directory to Python path so 'app' module can be imported
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))
