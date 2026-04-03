"""
Compatibility entrypoint for existing startup commands.

Run either:
- python -m uvicorn main:app --reload --port 8000
- python -m uvicorn server:app --reload --port 8000

Both now serve the MySQL/SQLAlchemy app from `main.py`.
"""

from main import app

