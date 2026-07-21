from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from pymongo.database import Database
from app.dependencies import get_db, get_current_admin
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, PaginatedProductResponse
from app.services.product_service import (
    create_product,
    get_product_by_id_or_slug,
    list_products,
    update_product,
    delete_product
)

router = APIRouter(prefix="/products", tags=["Products"])

@router.get(
    "",
    response_model=PaginatedProductResponse,
    status_code=status.HTTP_200_OK,
    summary="List & filter products with pagination",
    description="Retrieves a paginated list of store products with optional filters: search keyword, category, price range, featured status, new arrivals, best sellers, and sorting options."
)
async def list_all_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for name, description, fabric, brand, SKU"),
    category: Optional[str] = Query(None, description="Filter by category name or slug"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    is_featured: Optional[bool] = Query(None, description="Filter featured products"),
    is_new_arrival: Optional[bool] = Query(None, description="Filter new arrival products"),
    is_best_seller: Optional[bool] = Query(None, description="Filter best seller products"),
    sort_by: Optional[str] = Query("created_at_desc", description="Sort order: created_at_desc, price_asc, price_desc, name_asc, rating_desc"),
    status_filter: Optional[str] = Query("published", description="Status filter: published, draft (Admin toggle)"),
    db: Database = Depends(get_db)
):
    return list_products(
        db=db,
        page=page,
        limit=limit,
        search=search,
        category=category,
        min_price=min_price,
        max_price=max_price,
        is_featured=is_featured,
        is_new_arrival=is_new_arrival,
        is_best_seller=is_best_seller,
        status_filter=status_filter,
        sort_by=sort_by
    )

@router.get(
    "/featured",
    response_model=PaginatedProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get featured products",
    description="Shortcut endpoint to retrieve featured products."
)
async def get_featured_products(
    limit: int = Query(8, ge=1, le=50),
    db: Database = Depends(get_db)
):
    return list_products(db=db, page=1, limit=limit, is_featured=True)

@router.get(
    "/new-arrivals",
    response_model=PaginatedProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get new arrival products",
    description="Shortcut endpoint to retrieve new arrival products."
)
async def get_new_arrival_products(
    limit: int = Query(8, ge=1, le=50),
    db: Database = Depends(get_db)
):
    return list_products(db=db, page=1, limit=limit, is_new_arrival=True)

@router.get(
    "/best-sellers",
    response_model=PaginatedProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get best selling products",
    description="Shortcut endpoint to retrieve best selling products."
)
async def get_best_selling_products(
    limit: int = Query(8, ge=1, le=50),
    db: Database = Depends(get_db)
):
    return list_products(db=db, page=1, limit=limit, is_best_seller=True)

@router.get(
    "/{identifier}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single product by ID or slug",
    description="Retrieves full product details using product ObjectId or slug identifier."
)
async def get_single_product(
    identifier: str,
    db: Database = Depends(get_db)
):
    return get_product_by_id_or_slug(db, identifier)

@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new product (Admin Only)",
    description="Creates a new store product. Requires Admin privileges."
)
async def add_product(
    product_data: ProductCreate,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    return create_product(db, product_data)

@router.put(
    "/{identifier}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Edit a product (Admin Only)",
    description="Updates an existing product's details. Requires Admin privileges."
)
async def edit_product(
    identifier: str,
    product_data: ProductUpdate,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    return update_product(db, identifier, product_data)

@router.delete(
    "/{identifier}",
    status_code=status.HTTP_200_OK,
    summary="Delete a product (Admin Only)",
    description="Soft-deletes a product by default (or hard deletes if hard_delete=true). Requires Admin privileges."
)
async def remove_product(
    identifier: str,
    hard_delete: bool = Query(False, description="Set to true for permanent database deletion"),
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    return delete_product(db, identifier, hard_delete=hard_delete)
