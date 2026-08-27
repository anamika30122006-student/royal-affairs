import sys
import os
from pathlib import Path

current_file = Path(__file__).resolve()
base_dir = current_file.parent

# Search for the directory containing app/main.py
search_paths = [
    base_dir.parent,
    base_dir.parent / "backend",
    base_dir.parent / "royal-affair-store" / "backend",
    base_dir.parent.parent / "royal-affair-store" / "backend",
    Path(os.getcwd()),
    Path(os.getcwd()) / "royal-affair-store" / "backend",
    Path(os.getcwd()) / "backend",
]

for p in search_paths:
    if p.exists() and (p / "app" / "main.py").exists():
        if str(p) not in sys.path:
            sys.path.insert(0, str(p))
        break

from app.main import app
