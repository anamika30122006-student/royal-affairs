from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from pymongo.database import Database
from app.dependencies import get_db, get_current_admin
from app.schemas.product import ProductCreate, ProductUpdate, StockPatchRequest, ProductResponse, PaginatedProductResponse
from app.services.product_service import ProductService

router = APIRouter(prefix="/admin/products", tags=["Admin Products"])

@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new product (Admin Only)",
    description="Creates a new store product. Requires Admin or Super Admin privileges."
)
async def create_admin_product(
    product_data: ProductCreate,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = ProductService(db)
    return service.create(product_data)

@router.get(
    "/all",
    response_model=PaginatedProductResponse,
    status_code=status.HTTP_200_OK,
    summary="List all products including drafts, inactive, and soft-deleted (Admin Only)",
    description="Retrieves a paginated list of all products including draft, inactive, and soft-deleted products. Requires Admin privileges."
)
async def list_all_admin_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term across SKU, name, slug, fabric, brand, description"),
    category: Optional[str] = Query(None, description="Filter by category slug, name, or category_id"),
    status_filter: Optional[str] = Query(None, description="Product status filter (e.g. published, draft)"),
    include_deleted: bool = Query(True, description="Whether to include soft-deleted products"),
    sort: Optional[str] = Query("newest", description="Sort order"),
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = ProductService(db)
    return service.list_products(
        page=page,
        limit=limit,
        search=search,
        category=category,
        status_filter=status_filter,
        sort=sort,
        public_only=False,
        include_deleted=include_deleted
    )

@router.get(
    "/by-sku/{sku}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get product by SKU (Admin Only)",
    description="Retrieves product details by exact or case-insensitive SKU. Includes inactive/draft/deleted states. Requires Admin privileges."
)
async def get_admin_product_by_sku(
    sku: str,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = ProductService(db)
    return service.get_by_sku(sku, public_only=False)

@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get product by ID (Admin Only)",
    description="Retrieves product details by 24-character ObjectId string. Includes inactive/draft/deleted states. Requires Admin privileges."
)
async def get_admin_product_by_id(
    product_id: str,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = ProductService(db)
    return service.get_by_id(product_id, public_only=False)


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Update product details (Admin Only)",
    description="Updates an existing product's specifications. Requires Admin or Super Admin privileges."
)
async def update_admin_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = ProductService(db)
    return service.update(product_id, product_data)

@router.patch(
    "/{product_id}/stock",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Update product stock quantity (Admin Only)",
    description="Updates available inventory stock quantity for a product. Requires Admin or Super Admin privileges."
)
async def patch_admin_product_stock(
    product_id: str,
    stock_data: StockPatchRequest,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = ProductService(db)
    return service.update_stock(product_id, stock_data)

@router.delete(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft delete product (Admin Only)",
    description="Soft-deletes a product by setting is_deleted=True. Requires Admin or Super Admin privileges."
)
async def delete_admin_product(
    product_id: str,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = ProductService(db)
    return service.soft_delete(product_id)
