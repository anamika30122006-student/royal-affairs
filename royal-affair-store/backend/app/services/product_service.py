import re
import math
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from bson import ObjectId
from pymongo.database import Database
from pymongo import ASCENDING, DESCENDING
from fastapi import HTTPException, status
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, PaginatedProductResponse
from app.services.category_service import slugify

# Sample initial product dataset for auto-seeding if MongoDB collection is empty
SEED_PRODUCTS = [
    {
        "name": "Aafreen Organza Anarkali Suit",
        "slug": "aafreen-organza-anarkali-suit",
        "sku": "RA-ANARKALI-01",
        "brand": "Royal Affair",
        "category": "Anarkali Suits",
        "price": 12999.0,
        "original_price": 16999.0,
        "discount_percent": 23,
        "fabric": "Pure Silk Velvet & Georgette",
        "colors": ["Plum", "Deep Maroon", "Gold"],
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "stock": 12,
        "thumbnail_image": "./assets/images/anarkali_maroon.jpg",
        "images": ["./assets/images/anarkali_maroon.jpg", "./assets/images/anarkali_maroon_back.jpg"],
        "description": "Exquisite regal maroon velvet Anarkali decorated with traditional Zardozi hand-embroidery, silk lining, and matching heavy dupatta.",
        "details": ["Hand Embroidery Zardozi", "Dry Clean Only", "Includes Kameez, Dupatta & Tailored Pants"],
        "status": "published",
        "is_featured": True,
        "is_new_arrival": True,
        "is_best_seller": True,
        "rating": 4.9,
        "review_count": 24
    },
    {
        "name": "Gulbagh Silk Sharara Set",
        "slug": "gulbagh-silk-sharara-set",
        "sku": "RA-SHARARA-02",
        "brand": "Royal Affair",
        "category": "Sharara Sets",
        "price": 14500.0,
        "original_price": 18500.0,
        "discount_percent": 21,
        "fabric": "Chanderi Silk & Chiffon",
        "colors": ["Plum", "Ivory", "Peach"],
        "sizes": ["S", "M", "L", "XL"],
        "stock": 8,
        "thumbnail_image": "./assets/images/sharara_plum.jpg",
        "images": ["./assets/images/sharara_plum.jpg", "./assets/images/sharara_plum_alt.jpg"],
        "description": "Rich plum-purple embroidered sharara set with flared multi-tiered pants and delicate gota patti borders.",
        "details": ["Gota Patti Work", "Dry Clean Only", "Includes Short Kurti, Flared Sharara & Dupatta"],
        "status": "published",
        "is_featured": True,
        "is_new_arrival": False,
        "is_best_seller": True,
        "rating": 4.8,
        "review_count": 18
    },
    {
        "name": "Mehtab Embroidered Salwar Kameez",
        "slug": "mehtab-embroidered-salwar-kameez",
        "sku": "RA-KAMEEZ-03",
        "brand": "Royal Affair",
        "category": "Salwar Kameez",
        "price": 9800.0,
        "original_price": 12500.0,
        "discount_percent": 21,
        "fabric": "Raw Silk & Organza",
        "colors": ["Ivory", "Muted Gold", "Soft Pink"],
        "sizes": ["M", "L", "XL", "XXL"],
        "stock": 15,
        "thumbnail_image": "./assets/images/kameez_ivory.jpg",
        "images": ["./assets/images/kameez_ivory.jpg", "./assets/images/kameez_ivory_back.jpg"],
        "description": "Classic ivory raw silk straight-cut kameez with intricate neckline thread embroidery and tissue organza dupatta.",
        "details": ["Thread & Pearl Work", "Dry Clean Recommended", "Includes Kameez, Salwar & Dupatta"],
        "status": "published",
        "is_featured": False,
        "is_new_arrival": True,
        "is_best_seller": False,
        "rating": 4.7,
        "review_count": 15
    },
    {
        "name": "Nazakat Gold Palazzo Suit",
        "slug": "nazakat-gold-palazzo-suit",
        "sku": "RA-PALAZZO-04",
        "brand": "Royal Affair",
        "category": "Palazzo Suits",
        "price": 11200.0,
        "original_price": 14000.0,
        "discount_percent": 20,
        "fabric": "Banarasi Silk & Georgette",
        "colors": ["Muted Gold", "Cream", "Plum"],
        "sizes": ["S", "M", "L", "XL"],
        "stock": 10,
        "thumbnail_image": "./assets/images/palazzo_gold.jpg",
        "images": ["./assets/images/palazzo_gold.jpg", "./assets/images/palazzo_gold_alt.jpg"],
        "description": "Luxe champagne gold Banarasi silk kurta styled with wide-leg embroidered palazzos and zari border dupatta.",
        "details": ["Banarasi Zari Weave", "Dry Clean Only", "Includes Kurta, Palazzo & Dupatta"],
        "status": "published",
        "is_featured": True,
        "is_new_arrival": True,
        "is_best_seller": False,
        "rating": 4.85,
        "review_count": 21
    }
]

def format_product_response(doc: dict) -> ProductResponse:
    """Format MongoDB product document to ProductResponse Pydantic schema."""
    return ProductResponse(
        id=str(doc["_id"]),
        name=doc.get("name", ""),
        slug=doc.get("slug", ""),
        sku=doc.get("sku", ""),
        brand=doc.get("brand", "Royal Affair"),
        category=doc.get("category", ""),
        price=float(doc.get("price", 0.0)),
        original_price=float(doc.get("original_price")) if doc.get("original_price") else None,
        discount_percent=doc.get("discount_percent", 0),
        fabric=doc.get("fabric"),
        colors=doc.get("colors", []),
        sizes=doc.get("sizes", []),
        stock=doc.get("stock", 0),
        thumbnail_image=doc.get("thumbnail_image"),
        images=doc.get("images", []),
        description=doc.get("description"),
        details=doc.get("details", []),
        status=doc.get("status", "published"),
        is_featured=doc.get("is_featured", False),
        is_new_arrival=doc.get("is_new_arrival", False),
        is_best_seller=doc.get("is_best_seller", False),
        is_deleted=doc.get("is_deleted", False),
        rating=float(doc.get("rating", 4.8)),
        review_count=int(doc.get("review_count", 14)),
        created_at=doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        updated_at=doc.get("updated_at").isoformat() if isinstance(doc.get("updated_at"), datetime) else str(doc.get("updated_at", ""))
    )

def seed_initial_products_if_empty(db: Database) -> None:
    """Seed initial collection of products if MongoDB products collection is empty."""
    try:
        if db is not None and db.products.count_documents({}) == 0:
            now = datetime.now(timezone.utc)
            for prod in SEED_PRODUCTS:
                prod_doc = prod.copy()
                prod_doc["is_deleted"] = False
                prod_doc["created_at"] = now
                prod_doc["updated_at"] = now
                db.products.insert_one(prod_doc)
    except Exception:
        pass

def create_product(db: Database, data: ProductCreate) -> ProductResponse:
    """Create a new product (Admin Only)."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    slug = data.slug.strip() if data.slug else slugify(data.name)
    sku = data.sku.strip().upper()

    # Check duplicate slug or SKU
    if db.products.find_one({"slug": slug, "is_deleted": {"$ne": True}}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product slug '{slug}' is already in use.")

    if db.products.find_one({"sku": sku, "is_deleted": {"$ne": True}}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product SKU '{sku}' is already in use.")

    now = datetime.now(timezone.utc)
    prod_doc = {
        "name": data.name.strip(),
        "slug": slug,
        "sku": sku,
        "brand": data.brand.strip() if data.brand else "Royal Affair",
        "category": data.category.strip(),
        "price": float(data.price),
        "original_price": float(data.original_price) if data.original_price else None,
        "discount_percent": data.discount_percent,
        "fabric": data.fabric.strip() if data.fabric else None,
        "colors": [c.strip() for c in data.colors],
        "sizes": [s.strip() for s in data.sizes],
        "stock": data.stock,
        "thumbnail_image": data.thumbnail_image.strip() if data.thumbnail_image else (data.images[0] if data.images else None),
        "images": [img.strip() for img in data.images],
        "description": data.description.strip() if data.description else None,
        "details": data.details or [],
        "status": data.status if data.status in ("published", "draft") else "published",
        "is_featured": data.is_featured,
        "is_new_arrival": data.is_new_arrival,
        "is_best_seller": data.is_best_seller,
        "is_deleted": False,
        "rating": 4.8,
        "review_count": 1,
        "created_at": now,
        "updated_at": now
    }

    result = db.products.insert_one(prod_doc)
    prod_doc["_id"] = result.inserted_id
    return format_product_response(prod_doc)

def get_product_by_id_or_slug(db: Database, identifier: str) -> ProductResponse:
    """Retrieve product by ObjectId string or slug."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    # Auto seed if empty
    seed_initial_products_if_empty(db)

    doc = None
    if ObjectId.is_valid(identifier):
        doc = db.products.find_one({"_id": ObjectId(identifier), "is_deleted": {"$ne": True}})

    if not doc:
        doc = db.products.find_one({"slug": identifier.lower(), "is_deleted": {"$ne": True}})

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{identifier}' not found.")

    return format_product_response(doc)

def list_products(
    db: Database,
    page: int = 1,
    limit: int = 12,
    search: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_featured: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    status_filter: Optional[str] = "published",
    sort_by: Optional[str] = "created_at_desc",
    include_deleted: bool = False
) -> PaginatedProductResponse:
    """List products with pagination, search, category filter, price filter, and status filters."""
    if db is None:
        return PaginatedProductResponse(total=0, page=page, limit=limit, total_pages=0, products=[])

    # Auto seed if empty
    seed_initial_products_if_empty(db)

    query: Dict[str, Any] = {}

    if not include_deleted:
        query["is_deleted"] = {"$ne": True}

    if status_filter:
        query["status"] = status_filter

    if category:
        # Match category name or category slug regex
        query["$or"] = [
            {"category": {"$regex": category, "$options": "i"}},
            {"category": category}
        ]

    if is_featured is not None:
        query["is_featured"] = is_featured

    if is_new_arrival is not None:
        query["is_new_arrival"] = is_new_arrival

    if is_best_seller is not None:
        query["is_best_seller"] = is_best_seller

    # Price range filter
    if min_price is not None or max_price is not None:
        price_query = {}
        if min_price is not None:
            price_query["$gte"] = float(min_price)
        if max_price is not None:
            price_query["$lte"] = float(max_price)
        query["price"] = price_query

    # Search filter
    if search:
        search_pattern = re.compile(re.escape(search.strip()), re.IGNORECASE)
        search_or = [
            {"name": search_pattern},
            {"description": search_pattern},
            {"fabric": search_pattern},
            {"brand": search_pattern},
            {"sku": search_pattern},
            {"category": search_pattern}
        ]
        if "$or" in query:
            query["$and"] = [{"$or": query.pop("$or")}, {"$or": search_or}]
        else:
            query["$or"] = search_or

    # Sorting
    sort_spec = [("created_at", DESCENDING)]
    if sort_by == "price_asc":
        sort_spec = [("price", ASCENDING)]
    elif sort_by == "price_desc":
        sort_spec = [("price", DESCENDING)]
    elif sort_by == "name_asc":
        sort_spec = [("name", ASCENDING)]
    elif sort_by == "rating_desc":
        sort_spec = [("rating", DESCENDING)]

    # Pagination calculation
    page = max(1, page)
    limit = max(1, min(100, limit))
    skip = (page - 1) * limit

    total = db.products.count_documents(query)
    total_pages = math.ceil(total / limit) if total > 0 else 0

    docs = list(db.products.find(query).sort(sort_spec).skip(skip).limit(limit))
    products = [format_product_response(doc) for doc in docs]

    return PaginatedProductResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        products=products
    )

def update_product(db: Database, identifier: str, data: ProductUpdate) -> ProductResponse:
    """Update product details (Admin Only)."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    prod_resp = get_product_by_id_or_slug(db, identifier)
    prod_id = ObjectId(prod_resp.id)

    update_dict: Dict[str, Any] = {}

    for field, val in data.model_dump(exclude_unset=True).items():
        if val is not None:
            if field == "name":
                update_dict["name"] = val.strip()
            elif field == "slug":
                update_dict["slug"] = slugify(val)
            elif field == "sku":
                update_dict["sku"] = val.strip().upper()
            else:
                update_dict[field] = val

    if not update_dict:
        return prod_resp

    # Check duplicate slug / sku if updating
    if "slug" in update_dict:
        dup_slug = db.products.find_one({"slug": update_dict["slug"], "_id": {"$ne": prod_id}, "is_deleted": {"$ne": True}})
        if dup_slug:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product slug '{update_dict['slug']}' is already in use.")

    if "sku" in update_dict:
        dup_sku = db.products.find_one({"sku": update_dict["sku"], "_id": {"$ne": prod_id}, "is_deleted": {"$ne": True}})
        if dup_sku:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product SKU '{update_dict['sku']}' is already in use.")

    update_dict["updated_at"] = datetime.now(timezone.utc)
    db.products.update_one({"_id": prod_id}, {"$set": update_dict})

    updated_doc = db.products.find_one({"_id": prod_id})
    return format_product_response(updated_doc)

def delete_product(db: Database, identifier: str, hard_delete: bool = False) -> dict:
    """Delete a product (Soft Delete by default; Admin Only)."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    prod_resp = get_product_by_id_or_slug(db, identifier)
    prod_id = ObjectId(prod_resp.id)

    if hard_delete:
        db.products.delete_one({"_id": prod_id})
        message = f"Product '{prod_resp.name}' permanently deleted."
    else:
        db.products.update_one(
            {"_id": prod_id},
            {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc)}}
        )
        message = f"Product '{prod_resp.name}' soft-deleted successfully."

    return {"status": "success", "message": message}
