from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from pymongo.database import Database
from app.dependencies import get_db, get_current_admin
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category_service import (
    create_category,
    get_categories,
    get_category_by_id_or_slug,
    update_category,
    delete_category
)

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get(
    "",
    response_model=List[CategoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List all categories",
    description="Retrieves a list of all active store categories. Publicly accessible."
)
async def list_all_categories(
    include_inactive: bool = Query(False, description="Set to true to include inactive categories (Admin feature)"),
    db: Database = Depends(get_db)
):
    return get_categories(db, include_inactive=include_inactive)

@router.get(
    "/{identifier}",
    response_model=CategoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get category details by ID or slug",
    description="Retrieves category details by category ObjectId or slug string. Publicly accessible."
)
async def get_single_category(
    identifier: str,
    db: Database = Depends(get_db)
):
    return get_category_by_id_or_slug(db, identifier)

@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new category (Admin Only)",
    description="Creates a new category. Requires Admin privileges."
)
async def add_category(
    category_data: CategoryCreate,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    return create_category(db, category_data)

@router.put(
    "/{identifier}",
    response_model=CategoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Edit a category (Admin Only)",
    description="Updates existing category details. Requires Admin privileges."
)
async def edit_category(
    identifier: str,
    category_data: CategoryUpdate,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    return update_category(db, identifier, category_data)

@router.delete(
    "/{identifier}",
    status_code=status.HTTP_200_OK,
    summary="Delete a category (Admin Only)",
    description="Deletes a category from the store. Requires Admin privileges."
)
async def remove_category(
    identifier: str,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    return delete_category(db, identifier)
