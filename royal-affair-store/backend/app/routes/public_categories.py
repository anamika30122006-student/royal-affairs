from typing import List
from fastapi import APIRouter, Depends, status
from pymongo.database import Database
from app.dependencies import get_db
from app.schemas.category import CategoryResponse
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Public Categories"])

@router.get(
    "",
    response_model=List[CategoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List all active categories",
    description="Retrieves a list of all active store categories. Publicly accessible."
)
async def list_public_categories(db: Database = Depends(get_db)):
    service = CategoryService(db)
    return service.get_all(include_inactive=False)

@router.get(
    "/{slug}",
    response_model=CategoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get active category by slug",
    description="Retrieves category details by category slug string. Publicly accessible."
)
async def get_public_category_by_slug(
    slug: str,
    db: Database = Depends(get_db)
):
    service = CategoryService(db)
    return service.get_by_slug(slug, public_only=True)
