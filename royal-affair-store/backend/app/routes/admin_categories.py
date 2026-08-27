from fastapi import APIRouter, Depends, status
from pymongo.database import Database
from app.dependencies import get_db, get_current_admin
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category_service import CategoryService

router = APIRouter(prefix="/admin/categories", tags=["Admin Categories"])

@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new category (Admin Only)",
    description="Creates a new category. Requires Admin or Super Admin privileges."
)
async def create_admin_category(
    category_data: CategoryCreate,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = CategoryService(db)
    return service.create(category_data)

@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Update category details (Admin Only)",
    description="Updates an existing category. Requires Admin or Super Admin privileges."
)
async def update_admin_category(
    category_id: str,
    category_data: CategoryUpdate,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = CategoryService(db)
    return service.update(category_id, category_data)

@router.delete(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a category (Admin Only)",
    description="Deletes a category. Requires Admin or Super Admin privileges."
)
async def delete_admin_category(
    category_id: str,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = CategoryService(db)
    return service.delete(category_id)
