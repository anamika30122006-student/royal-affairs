import logging
import re
from pymongo import MongoClient, ASCENDING
from pymongo.database import Database
from pymongo.errors import PyMongoError
from app.config import settings

logger = logging.getLogger("royal_affair.database")

REQUIRED_COLLECTIONS = [
    "users",
    "products",
    "categories",
    "orders",
    "payments",
    "carts",
    "wishlist",
    "reviews",
    "coupons",
    "admin_logs"
]

def sanitize_url(url: str) -> str:
    """Mask password inside MongoDB connection URL for safe logging."""
    if not url:
        return ""
    return re.sub(r'mongodb(\+srv)?://([^:]+):([^@]+)@', r'mongodb\1://\2:****@', url)

# 1. ONE global MongoClient instance
client: MongoClient = None
db: Database = None

# 2. Shared mutable dictionary for database connection state
database_state = {
    "connected": False
}

def create_indexes(database_instance: Database) -> None:
    """Create required unique and sparse indexes for collections."""
    try:
        # 1. Users Indexes
        database_instance.users.create_index([("email", ASCENDING)], unique=True, name="uniq_users_email")
        database_instance.users.create_index([("phone", ASCENDING)], unique=True, sparse=True, name="uniq_users_phone")

        # 2. Products Indexes
        database_instance.products.create_index([("slug", ASCENDING)], unique=True, name="uniq_products_slug")
        database_instance.products.create_index([("sku", ASCENDING)], unique=True, name="uniq_products_sku")

        # 3. Orders Index
        database_instance.orders.create_index([("order_number", ASCENDING)], unique=True, name="uniq_orders_order_number")

        # 4. Coupons Index
        database_instance.coupons.create_index([("code", ASCENDING)], unique=True, name="uniq_coupons_code")

        logger.info("Database indexes created/verified successfully.")
    except Exception as e:
        logger.warning(f"Could not complete database index creation: {e}")

def connect_to_mongo() -> None:
    """Connect to MongoDB during application startup without crashing on failure."""
    global client, db
    safe_url = sanitize_url(settings.MONGODB_URL)
    try:
        client = MongoClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000
        )
        db = client[settings.MONGODB_DATABASE]

        # Verify connection using ping command
        ping_res = client.admin.command("ping")
        if ping_res.get("ok") in (1, 1.0):
            # 3. Update connection state dictionary
            database_state["connected"] = True
            logger.info(f"Connected to MongoDB successfully at {safe_url} (Database: {settings.MONGODB_DATABASE})")

            # Automatically create missing collections
            existing = db.list_collection_names()
            for col in REQUIRED_COLLECTIONS:
                if col not in existing:
                    db.create_collection(col)
                    logger.info(f"Created collection: {col}")

            # Setup indexes
            create_indexes(db)
        else:
            database_state["connected"] = False
            logger.warning(f"MongoDB ping response was not ok:1 ({ping_res})")

    except PyMongoError as pme:
        database_state["connected"] = False
        logger.error(f"MongoDB connection failed for {safe_url}: {pme}. Running application in disconnected mode.")
    except Exception as e:
        database_state["connected"] = False
        logger.error(f"Unexpected error connecting to MongoDB: {e}")

def close_mongo_connection() -> None:
    """Close MongoDB client during application shutdown."""
    global client, db
    database_state["connected"] = False
    if client:
        try:
            client.close()
            logger.info("MongoDB client connection closed cleanly.")
        except Exception as e:
            logger.warning(f"Error closing MongoDB client: {e}")
        finally:
            client = None
            db = None

# 4. Function to get string status from database_state dictionary
def get_database_status() -> str:
    return "connected" if database_state["connected"] else "disconnected"

def ping_database_fresh() -> bool:
    """Performs a fresh MongoDB ping on every request for GET /health/database."""
    global client
    if not client:
        return False
    try:
        res = client.admin.command("ping")
        is_ok = (res.get("ok") in (1, 1.0))
        database_state["connected"] = is_ok
        return is_ok
    except Exception:
        database_state["connected"] = False
        return False

def get_database() -> Database:
    """Get active PyMongo Database instance."""
    return db
