import sys
import os
from pathlib import Path

# Add backend root directory to sys.path for standalone script execution
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import datetime, timezone
from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.utils.security import hash_password

DEFAULT_ADMIN_EMAIL = "admin@royalaffair.com"
DEFAULT_ADMIN_PASSWORD = "Royal@12345"
DEFAULT_ADMIN_NAME = "Royal Admin"

def create_default_admin():
    """Bootstrap default admin user into MongoDB if not already present."""
    connect_to_mongo()
    db = get_database()

    if db is None:
        print("Error: Unable to connect to MongoDB database. Please check your .env settings.")
        return

    # Check if default admin user exists
    existing_admin = db.users.find_one({"email": DEFAULT_ADMIN_EMAIL.lower()})

    if existing_admin:
        print("Admin already exists.")
    else:
        now = datetime.now(timezone.utc)
        admin_doc = {
            "full_name": DEFAULT_ADMIN_NAME,
            "email": DEFAULT_ADMIN_EMAIL.lower(),
            "hashed_password": hash_password(DEFAULT_ADMIN_PASSWORD),
            "role": "admin",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        res = db.users.insert_one(admin_doc)
        print(f"Default admin created successfully with ID: {res.inserted_id}")
        print(f"Name: {DEFAULT_ADMIN_NAME}")
        print(f"Email: {DEFAULT_ADMIN_EMAIL}")
        print(f"Password: {DEFAULT_ADMIN_PASSWORD}")
        print(f"Role: admin")
        print(f"is_active: True")

    close_mongo_connection()

if __name__ == "__main__":
    create_default_admin()
