from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
import app.database as database
from app.routes.auth import router as auth_router
from app.routes.categories import router as categories_router
from app.routes.products import router as products_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas / Local
    database.connect_to_mongo()
    yield
    # Shutdown: Close MongoDB client
    database.close_mongo_connection()

app = FastAPI(
    title=settings.APP_NAME,
    description="FastAPI & MongoDB Backend for Royal Affair – Designer Suits E-Commerce Store",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")

@app.get("/", tags=["Root"])
async def root():
    return {
        "status": "online",
        "database": database.get_database_status(),
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "database": database.get_database_status(),
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health/database", tags=["Health"])
async def health_database_check():
    is_connected = database.ping_database_fresh()
    return {
        "connected": is_connected
    }
