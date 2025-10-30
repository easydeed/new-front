"""
Create storage directories for External API on startup.
Phase 22-B: Ensures local storage directory exists before FastAPI mounts it.
"""
import os
from pathlib import Path

def create_storage_dirs():
    """Create necessary storage directories if they don't exist."""
    # Get the directory where this script is located
    base_dir = Path(__file__).parent
    
    # Create storage directory structure
    storage_dir = base_dir / "storage" / "files"
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"✅ Storage directory created/verified: {storage_dir}")
    
    return str(storage_dir)

if __name__ == "__main__":
    create_storage_dirs()

