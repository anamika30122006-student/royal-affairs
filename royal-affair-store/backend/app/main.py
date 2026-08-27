from pathlib import Path
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.config import settings
import app.database as database
from app.routes.auth import router as auth_router
from app.routes.public_categories import router as public_categories_router
from app.routes.admin_categories import router as admin_categories_router
from app.routes.public_products import router as public_products_router
from app.routes.admin_products import router as admin_products_router
from app.routes.admin_uploads import router as admin_uploads_router
from app.routes.orders import public_router as public_orders_router, admin_router as admin_orders_router
from app.routes.public_collections import router as public_collections_router
from app.routes.admin_collections import router as admin_collections_router
from app.routes.payments import router as payments_router
from app.routes.engagement import public_router as engagement_public_router, admin_router as engagement_admin_router

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
UPLOADS_PRODUCTS_DIR = BASE_DIR / "uploads" / "products"
UPLOADS_REVIEWS_DIR = BASE_DIR / "uploads" / "reviews"

try:
    UPLOADS_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)   # ensure exists at startup
    UPLOADS_REVIEWS_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass

# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas / Local
    database.connect_to_mongo()
    # Log Razorpay configuration status (do NOT print keys)
    try:
        razorpay_configured = bool(
            settings.RAZORPAY_KEY_ID.strip() and settings.RAZORPAY_KEY_SECRET.strip()
            and not settings.RAZORPAY_KEY_ID.strip().startswith("rzp_test_xxx")
        )
    except Exception:
        razorpay_configured = False
    logging.getLogger("uvicorn").info(f"Razorpay configured: {razorpay_configured}")
    yield
    # Shutdown: Close MongoDB client
    database.close_mongo_connection()

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description="FastAPI & MongoDB Backend for Royal Affair – Designer Suits E-Commerce Store",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://.*|null",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static files – serve uploaded product images
# NOTE FOR PRODUCTION: Replace this with a CDN / cloud storage URL.
# ---------------------------------------------------------------------------
if UPLOADS_PRODUCTS_DIR.exists():
    app.mount(
        "/uploads/products",
        StaticFiles(directory=str(UPLOADS_PRODUCTS_DIR)),
        name="product_uploads",
    )
if UPLOADS_REVIEWS_DIR.exists():
    app.mount(
        "/uploads/reviews",
        StaticFiles(directory=str(UPLOADS_REVIEWS_DIR)),
        name="review_uploads",
    )

# ---------------------------------------------------------------------------
# API v1 Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router,               prefix="/api/v1")
app.include_router(public_categories_router,  prefix="/api/v1")
app.include_router(admin_categories_router,   prefix="/api/v1")
app.include_router(public_products_router,    prefix="/api/v1")
app.include_router(admin_products_router,     prefix="/api/v1")
app.include_router(admin_uploads_router,      prefix="/api/v1")
app.include_router(public_orders_router,       prefix="/api/v1")
app.include_router(admin_orders_router,        prefix="/api/v1")
app.include_router(public_collections_router, prefix="/api/v1")
app.include_router(admin_collections_router,  prefix="/api/v1")
app.include_router(payments_router,           prefix="/api/v1")
app.include_router(engagement_public_router,  prefix="/api/v1")
app.include_router(engagement_admin_router,   prefix="/api/v1")

# ---------------------------------------------------------------------------
# Root / Health endpoints
# ---------------------------------------------------------------------------
@app.get("/", tags=["Root"])
async def root():
    return {
        "status": "online",
        "database": database.get_database_status(),
        "docs": "/docs",
        "health": "/health",
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "database": database.get_database_status(),
        "docs": "/docs",
        "health": "/health",
    }

@app.get("/health/database", tags=["Health"])
async def health_database_check():
    is_connected = database.ping_database_fresh()
    return {"connected": is_connected}
