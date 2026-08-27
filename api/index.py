import sys
import os
from pathlib import Path

current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent / "royal-affair-store" / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

search_paths = [
    backend_dir,
    current_dir.parent / "backend",
    Path(os.getcwd()),
    Path(os.getcwd()) / "royal-affair-store" / "backend",
    Path(os.getcwd()) / "backend",
]

for p in search_paths:
    if p.exists() and (p / "app" / "main.py").exists():
        if str(p) not in sys.path:
            sys.path.insert(0, str(p))

from app.main import app
