from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from pymongo.database import Database
from app.dependencies import get_db
from app.schemas.product import ProductResponse, PaginatedProductResponse
from app.services.product_service import ProductService, get_product_by_id_or_slug

router = APIRouter(prefix="/products", tags=["Public Products"])

@router.get(
    "",
    response_model=PaginatedProductResponse,
    status_code=status.HTTP_200_OK,
    summary="List & filter products with pagination",
    description="Retrieves a paginated list of active, published products with search, filters (category, price, size, color, fabric, occasion, featured, bestseller, new_arrival, in_stock), and sort options (newest, price_asc, price_desc, rating, discount)."
)
async def list_public_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term across name, description, fabric, brand, SKU"),
    category: Optional[str] = Query(None, description="Filter by category slug, name, or category_id"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    size: Optional[str] = Query(None, description="Filter by size (e.g. S, M, L, XL)"),
    color: Optional[str] = Query(None, description="Filter by color (e.g. Plum, Maroon, Gold)"),
    fabric: Optional[str] = Query(None, description="Filter by fabric material"),
    occasion: Optional[str] = Query(None, description="Filter by occasion (e.g. Bridal Wear, Festive Wear)"),
    featured: Optional[bool] = Query(None, description="Filter featured products"),
    bestseller: Optional[bool] = Query(None, description="Filter bestseller products"),
    new_arrival: Optional[bool] = Query(None, description="Filter new arrival products"),
    in_stock: Optional[bool] = Query(None, description="Filter products with stock > 0"),
    status: Optional[str] = Query("published", description="Product status filter"),
    sort: Optional[str] = Query("newest", description="Sort order: newest, price_asc, price_desc, rating, discount"),
    db: Database = Depends(get_db)
):
    service = ProductService(db)
    return service.list_products(
        page=page,
        limit=limit,
        search=search,
        category=category,
        min_price=min_price,
        max_price=max_price,
        size=size,
        color=color,
        fabric=fabric,
        occasion=occasion,
        featured=featured,
        bestseller=bestseller,
        new_arrival=new_arrival,
        in_stock=in_stock,
        status_filter=status,
        sort=sort,
        public_only=True
    )

@router.get(
    "/slug/{slug}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get active product by slug",
    description="Retrieves full details of a published product using its URL slug string."
)
async def get_public_product_by_slug(
    slug: str,
    db: Database = Depends(get_db)
):
    return get_product_by_id_or_slug(db, slug)

@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get active product by ID or slug",
    description="Retrieves full details of a published product using its 24-character ObjectId or slug string."
)
async def get_public_product_by_id(
    product_id: str,
    db: Database = Depends(get_db)
):
    return get_product_by_id_or_slug(db, product_id)
