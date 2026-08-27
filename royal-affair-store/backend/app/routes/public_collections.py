from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from pymongo.database import Database
from app.dependencies import get_db
from app.services.collection_service import (
    get_all_collections,
    get_collection_with_products
)

router = APIRouter(prefix="/collections", tags=["Public Collections"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_public_collections(db: Database = Depends(get_db)):
    """List all active collections for the storefront."""
    return get_all_collections(db, include_inactive=False)

@router.get("/{id_or_slug}", response_model=Dict[str, Any])
async def get_public_collection_detail(id_or_slug: str, db: Database = Depends(get_db)):
    """Get single collection details along with populated assigned products in order."""
    return get_collection_with_products(db, id_or_slug)
