from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from pymongo.database import Database
from app.dependencies import get_db, get_current_admin
from app.schemas.collection import CollectionCreate, CollectionUpdate, CollectionResponse
from app.services.collection_service import (
    get_all_collections,
    get_collection_by_id_or_slug,
    create_collection,
    update_collection,
    delete_collection
)
from app.services.collection_service import (
    add_products_to_collection,
    remove_product_from_collection,
    replace_collection_products
)

router = APIRouter(prefix="/admin/collections", tags=["Admin Collections"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_admin_collections(
    db: Database = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """List all collections including disabled ones for Admin."""
    return get_all_collections(db, include_inactive=True)

@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_admin_collection(
    data: CollectionCreate,
    db: Database = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Create a new collection."""
    return create_collection(db, data)

@router.get("/{id_or_slug}", response_model=Dict[str, Any])
async def get_admin_collection(
    id_or_slug: str,
    db: Database = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Get collection details for editing."""
    return get_collection_by_id_or_slug(db, id_or_slug)

@router.put("/{collection_id}", response_model=Dict[str, Any])
async def update_admin_collection(
    collection_id: str,
    data: CollectionUpdate,
    db: Database = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Update existing collection."""
    return update_collection(db, collection_id, data)

@router.delete("/{collection_id}")
async def delete_admin_collection(
    collection_id: str,
    db: Database = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Delete a collection."""
    return delete_collection(db, collection_id)


@router.post("/{collection_id}/products", response_model=Dict[str, Any])
async def add_products(
    collection_id: str,
    product_ids: List[str],
    db: Database = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Append products to a collection (preserves order, ignores duplicates)."""
    return add_products_to_collection(db, collection_id, product_ids)


@router.put("/{collection_id}/products", response_model=Dict[str, Any])
async def replace_products(
    collection_id: str,
    product_ids: List[str],
    db: Database = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Replace the collection's product ordering with provided list."""
    return replace_collection_products(db, collection_id, product_ids)


@router.delete("/{collection_id}/products/{product_id}")
async def remove_product(
    collection_id: str,
    product_id: str,
    db: Database = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Remove a single product from a collection."""
    return remove_product_from_collection(db, collection_id, product_id)
