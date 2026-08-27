import re
import math
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from bson import ObjectId
from pymongo.database import Database
from pymongo import ASCENDING, DESCENDING
from fastapi import HTTPException, status
from app.schemas.product import ProductCreate, ProductUpdate, StockPatchRequest, ProductResponse, PaginatedProductResponse
from app.repositories.product_repository import ProductRepository
from app.services.category_service import slugify

def _sync_product_collections(db: Database, product_id_str: str, collection_ids: List[str]):
    if db is None or not product_id_str:
        return
    clean_cids = [str(cid).strip() for cid in (collection_ids or []) if cid and str(cid).strip()]

    # Add product_id to specified collections
    for cid in clean_cids:
        query = {"_id": ObjectId(cid)} if ObjectId.is_valid(cid) else {"slug": cid.lower()}
        col_doc = db.collections.find_one(query)
        if col_doc:
            db.collections.update_one({"_id": col_doc["_id"]}, {"$addToSet": {"product_ids": product_id_str}})

    # Remove product_id from any collection not in clean_cids
    obj_cids = [ObjectId(cid) for cid in clean_cids if ObjectId.is_valid(cid)]
    slug_cids = [cid.lower() for cid in clean_cids if not ObjectId.is_valid(cid)]
    
    unmatch_query = {
        "_id": {"$nin": obj_cids},
        "slug": {"$nin": slug_cids},
        "product_ids": product_id_str
    }
    db.collections.update_many(unmatch_query, {"$pull": {"product_ids": product_id_str}})


# Sample product dataset for auto-seeding if MongoDB products collection is empty
SEED_PRODUCTS = [
    {
        "name": "Aafreen Organza Anarkali Suit",
        "slug": "aafreen-organza-anarkali-suit",
        "sku": "RA-ANARKALI-01",
        "short_description": "Regal maroon velvet Anarkali with zardozi embroidery.",
        "description": "Exquisite regal maroon velvet Anarkali decorated with traditional Zardozi hand-embroidery, silk lining, and matching heavy dupatta.",
        "category_id": "60d5ecb8b5c9c82c3c8b4567",
        "subcategory": "Anarkali Suit",
        "price": 12999.0,
        "original_price": 16999.0,
        "discount_percentage": 23.5,
        "stock": 12,
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": ["Plum", "Deep Maroon", "Gold"],
        "fabric": "Pure Silk Velvet & Georgette",
        "occasion": "Bridal Wear",
        "brand": "Royal Affair",
        "thumbnail": "./assets/images/anarkali_maroon.jpg",
        "images": ["./assets/images/anarkali_maroon.jpg", "./assets/images/anarkali_maroon_back.jpg"],
        "featured": True,
        "bestseller": True,
        "new_arrival": True,
        "status": "published",
        "is_active": True,
        "rating": 4.9,
        "review_count": 24
    },
    {
        "name": "Gulbagh Silk Sharara Set",
        "slug": "gulbagh-silk-sharara-set",
        "sku": "RA-SHARARA-02",
        "short_description": "Rich plum embroidered sharara set with multi-tiered pants.",
        "description": "Rich plum-purple embroidered sharara set with flared multi-tiered pants and delicate gota patti borders.",
        "category_id": "60d5ecb8b5c9c82c3c8b4568",
        "subcategory": "Sharara Set",
        "price": 14500.0,
        "original_price": 18500.0,
        "discount_percentage": 21.6,
        "stock": 8,
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Plum", "Ivory", "Peach"],
        "fabric": "Chanderi Silk & Chiffon",
        "occasion": "Festive Wear",
        "brand": "Royal Affair",
        "thumbnail": "./assets/images/sharara_plum.jpg",
        "images": ["./assets/images/sharara_plum.jpg", "./assets/images/sharara_plum_alt.jpg"],
        "featured": True,
        "bestseller": True,
        "new_arrival": False,
        "status": "published",
        "is_active": True,
        "rating": 4.8,
        "review_count": 18
    },
    {
        "name": "Mehtab Embroidered Salwar Kameez",
        "slug": "mehtab-embroidered-salwar-kameez",
        "sku": "RA-KAMEEZ-03",
        "short_description": "Classic ivory raw silk straight-cut kameez.",
        "description": "Classic ivory raw silk straight-cut kameez with intricate neckline thread embroidery and tissue organza dupatta.",
        "category_id": "60d5ecb8b5c9c82c3c8b4569",
        "subcategory": "Salwar Kameez",
        "price": 9800.0,
        "original_price": 12500.0,
        "discount_percentage": 21.6,
        "stock": 15,
        "sizes": ["M", "L", "XL", "XXL"],
        "colors": ["Ivory", "Muted Gold", "Soft Pink"],
        "fabric": "Raw Silk & Organza",
        "occasion": "Casual Luxury",
        "brand": "Royal Affair",
        "thumbnail": "./assets/images/kameez_ivory.jpg",
        "images": ["./assets/images/kameez_ivory.jpg", "./assets/images/kameez_ivory_back.jpg"],
        "featured": False,
        "bestseller": False,
        "new_arrival": True,
        "status": "published",
        "is_active": True,
        "rating": 4.7,
        "review_count": 15
    },
    {
        "name": "Nazakat Gold Palazzo Suit",
        "slug": "nazakat-gold-palazzo-suit",
        "sku": "RA-PALAZZO-04",
        "short_description": "Luxe champagne gold Banarasi silk kurta with palazzos.",
        "description": "Luxe champagne gold Banarasi silk kurta styled with wide-leg embroidered palazzos and zari border dupatta.",
        "category_id": "60d5ecb8b5c9c82c3c8b4570",
        "subcategory": "Palazzo Suit",
        "price": 11200.0,
        "original_price": 14000.0,
        "discount_percentage": 20.0,
        "stock": 10,
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Muted Gold", "Cream", "Plum"],
        "fabric": "Banarasi Silk & Georgette",
        "occasion": "Party Wear",
        "brand": "Royal Affair",
        "thumbnail": "./assets/images/palazzo_gold.jpg",
        "images": ["./assets/images/palazzo_gold.jpg", "./assets/images/palazzo_gold_alt.jpg"],
        "featured": True,
        "bestseller": False,
        "new_arrival": True,
        "status": "published",
        "is_active": True,
        "rating": 4.85,
        "review_count": 21
    }
]

def format_product_response(doc: dict, db: Optional[Database] = None) -> ProductResponse:
    """Format MongoDB product document to ProductResponse Pydantic schema."""
    raw_images = doc.get("images") or []
    if not isinstance(raw_images, list):
        raw_images = [raw_images] if raw_images else []

    primary_thumb = (
        doc.get("thumbnail") or
        doc.get("image") or
        (raw_images[0] if len(raw_images) > 0 else None) or
        doc.get("uploaded_image") or
        doc.get("cover_image")
    )

    if not raw_images:
        candidates = [doc.get("thumbnail"), doc.get("image"), doc.get("uploaded_image"), doc.get("cover_image")]
        raw_images = [img for img in candidates if img]

    pid_str = str(doc["_id"])
    cids = [str(cid) for cid in doc.get("collection_ids", []) if cid]
    if not cids and db is not None:
        try:
            matched_cols = list(db.collections.find({"product_ids": pid_str}))
            cids = [str(c["_id"]) for c in matched_cols]
        except Exception:
            pass

    return ProductResponse(
        id=pid_str,
        name=doc.get("name", ""),
        slug=doc.get("slug", ""),
        sku=doc.get("sku", ""),
        short_description=doc.get("short_description"),
        description=doc.get("description"),
        category_id=str(doc.get("category_id", "")),
        collection_ids=cids,
        subcategory=doc.get("subcategory"),
        price=float(doc.get("price", 0.0)),
        original_price=float(doc.get("original_price")) if doc.get("original_price") else None,
        discount_percentage=float(doc.get("discount_percentage", 0.0)) if doc.get("discount_percentage") else 0.0,
        stock=int(doc.get("stock", 0)),
        sizes=doc.get("sizes", []),
        colors=doc.get("colors", []),
        fabric=doc.get("fabric"),
        occasion=doc.get("occasion"),
        brand=doc.get("brand", "Royal Affair"),
        thumbnail=primary_thumb,
        images=raw_images,
        featured=doc.get("featured", False),
        bestseller=doc.get("bestseller", False),
        new_arrival=doc.get("new_arrival", False),
        status=doc.get("status", "published"),
        is_active=doc.get("is_active", True),
        is_deleted=doc.get("is_deleted", False),
        rating=float(doc.get("rating", 4.8)),
        review_count=int(doc.get("review_count", 14)),
        created_at=doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        updated_at=doc.get("updated_at").isoformat() if isinstance(doc.get("updated_at"), datetime) else str(doc.get("updated_at", ""))
    )


class ProductService:
    def __init__(self, db: Database):
        self.repo = ProductRepository(db)
        self.db = db

    def _seed_if_empty(self):
        try:
            if self.db is not None and self.db.products.count_documents({}) == 0:
                now = datetime.now(timezone.utc)
                for prod in SEED_PRODUCTS:
                    p = prod.copy()
                    p["is_deleted"] = False
                    p["created_at"] = now
                    p["updated_at"] = now
                    self.db.products.insert_one(p)
        except Exception:
            pass

    def create(self, data: ProductCreate) -> ProductResponse:
        slug = data.slug.strip().lower() if data.slug else slugify(data.name)
        sku = data.sku.strip().upper()

        # Check duplicate SKU (HTTP 409 Conflict)
        if self.repo.find_by_sku(sku):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{sku}' already exists."
            )

        # Check duplicate slug (HTTP 409 Conflict)
        if self.repo.find_by_slug(slug):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with slug '{slug}' already exists."
            )

        collection_ids = [str(cid).strip() for cid in (data.collection_ids or []) if cid]

        now = datetime.now(timezone.utc)
        prod_doc = {
            "name": data.name.strip(),
            "slug": slug,
            "sku": sku,
            "short_description": data.short_description.strip() if data.short_description else None,
            "description": data.description.strip() if data.description else None,
            "category_id": data.category_id.strip(),
            "collection_ids": collection_ids,
            "subcategory": data.subcategory.strip() if data.subcategory else None,
            "price": float(data.price),
            "original_price": float(data.original_price) if data.original_price else None,
            "discount_percentage": float(data.discount_percentage) if data.discount_percentage else 0.0,
            "stock": data.stock,
            "sizes": [s.strip() for s in data.sizes],
            "colors": [c.strip() for c in data.colors],
            "fabric": data.fabric.strip() if data.fabric else None,
            "occasion": data.occasion.strip() if data.occasion else None,
            "brand": data.brand.strip() if data.brand else "Royal Affair",
            "thumbnail": data.thumbnail.strip() if data.thumbnail else (data.images[0] if data.images else None),
            "images": [img.strip() for img in data.images],
            "featured": data.featured,
            "bestseller": data.bestseller,
            "new_arrival": data.new_arrival,
            "status": data.status if data.status in ("published", "draft") else "published",
            "is_active": data.is_active,
            "is_deleted": False,
            "rating": 4.8,
            "review_count": 0,
            "created_at": now,
            "updated_at": now
        }

        created = self.repo.insert(prod_doc)
        product_id_str = str(created["_id"])
        _sync_product_collections(self.db, product_id_str, collection_ids)
        return format_product_response(created, self.db)

    def get_by_id(self, product_id: str, public_only: bool = True) -> ProductResponse:
        self._seed_if_empty()

        if not ObjectId.is_valid(product_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invalid product ID format '{product_id}'."
            )

        extra = {}
        if public_only:
            extra = {
                "is_deleted": {"$ne": True},
                "is_active": True,
                "status": "published"
            }

        doc = self.repo.find_by_id(product_id, query_extra=extra)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{product_id}' not found."
            )

        return format_product_response(doc)

    def get_by_slug(self, slug: str, public_only: bool = True) -> ProductResponse:
        self._seed_if_empty()

        extra = {}
        if public_only:
            extra = {
                "is_deleted": {"$ne": True},
                "is_active": True,
                "status": "published"
            }

        doc = self.repo.find_by_slug(slug, query_extra=extra)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with slug '{slug}' not found."
            )

        return format_product_response(doc)

    def get_by_sku(self, sku: str, public_only: bool = True) -> ProductResponse:
        self._seed_if_empty()

        sku_clean = sku.strip()
        extra = {}
        if public_only:
            extra = {
                "is_deleted": {"$ne": True},
                "is_active": True,
                "status": "published"
            }

        doc = self.repo.find_by_sku(sku_clean, query_extra=extra)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with SKU '{sku_clean}' not found."
            )

        return format_product_response(doc)

    def list_products(
        self,
        page: int = 1,
        limit: int = 12,
        search: Optional[str] = None,
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        size: Optional[str] = None,
        color: Optional[str] = None,
        fabric: Optional[str] = None,
        occasion: Optional[str] = None,
        featured: Optional[bool] = None,
        bestseller: Optional[bool] = None,
        new_arrival: Optional[bool] = None,
        in_stock: Optional[bool] = None,
        status_filter: Optional[str] = "published",
        sort: Optional[str] = "newest",
        public_only: bool = True,
        include_deleted: bool = False
    ) -> PaginatedProductResponse:
        self._seed_if_empty()

        query: Dict[str, Any] = {}

        if public_only:
            query["is_deleted"] = False
            query["is_active"] = True
            query["status"] = "published"
        else:
            if not include_deleted:
                query["is_deleted"] = False
            if status_filter:
                query["status"] = status_filter

        if category:
            # Can match category_id or category slug or category name
            cat_obj = None
            if ObjectId.is_valid(category.strip()):
                cat_obj = self.db.categories.find_one({"_id": ObjectId(category.strip())})
            if not cat_obj:
                cat_obj = self.db.categories.find_one({"$or": [{"slug": category.lower().strip()}, {"name": category.strip()}]})
            if cat_obj:
                query["category_id"] = str(cat_obj["_id"])
            else:
                query["category_id"] = category.strip()

        if size:
            query["sizes"] = {"$regex": f"^{re.escape(size.strip())}$", "$options": "i"}

        if color:
            query["colors"] = {"$regex": re.escape(color.strip()), "$options": "i"}

        if fabric:
            query["fabric"] = {"$regex": re.escape(fabric.strip()), "$options": "i"}

        if occasion:
            query["occasion"] = {"$regex": re.escape(occasion.strip()), "$options": "i"}

        if featured is not None:
            query["featured"] = featured

        if bestseller is not None:
            query["bestseller"] = bestseller

        if new_arrival is not None:
            query["new_arrival"] = new_arrival

        if in_stock:
            query["stock"] = {"$gt": 0}

        # Price Range Filter
        if min_price is not None or max_price is not None:
            p_q = {}
            if min_price is not None:
                p_q["$gte"] = float(min_price)
            if max_price is not None:
                p_q["$lte"] = float(max_price)
            query["price"] = p_q

        # Search Query across SKU, name, slug, description, brand, fabric, occasion
        if search:
            rgx = re.compile(re.escape(search.strip()), re.IGNORECASE)
            search_clause = [
                {"name": rgx},
                {"slug": rgx},
                {"sku": rgx},
                {"description": rgx},
                {"short_description": rgx},
                {"brand": rgx},
                {"fabric": rgx},
                {"occasion": rgx}
            ]
            query["$or"] = search_clause

        # Sort Mapping
        sort_spec = [("created_at", DESCENDING)]
        if sort == "price_asc":
            sort_spec = [("price", ASCENDING)]
        elif sort == "price_desc":
            sort_spec = [("price", DESCENDING)]
        elif sort == "rating":
            sort_spec = [("rating", DESCENDING)]
        elif sort == "discount":
            sort_spec = [("discount_percentage", DESCENDING)]
        elif sort == "newest":
            sort_spec = [("created_at", DESCENDING)]

        # Pagination
        page = max(1, page)
        limit = max(1, min(100, limit))
        skip = (page - 1) * limit

        total = self.repo.count(query)
        total_pages = math.ceil(total / limit) if total > 0 else 0

        docs = self.repo.find_paginated(query, sort_spec, skip, limit)
        products = [format_product_response(d) for d in docs]

        return PaginatedProductResponse(
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            products=products
        )

    def update(self, product_id: str, data: ProductUpdate) -> ProductResponse:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invalid product ID format '{product_id}'."
            )
        obj_id = ObjectId(product_id)
        existing = self.repo.find_by_id(product_id)
        if not existing or existing.get("is_deleted"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{product_id}' not found."
            )

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
            return format_product_response(existing)

        # Check duplicate SKU if updating
        if "sku" in update_dict:
            dup_sku = self.db.products.find_one({"sku": update_dict["sku"], "_id": {"$ne": obj_id}})
            if dup_sku:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Product SKU '{update_dict['sku']}' is already in use."
                )

        # Check duplicate slug if updating
        if "slug" in update_dict:
            dup_slug = self.db.products.find_one({"slug": update_dict["slug"], "_id": {"$ne": obj_id}})
            if dup_slug:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Product slug '{update_dict['slug']}' is already in use."
                )

        if "collection_ids" in update_dict and update_dict["collection_ids"] is not None:
            clean_cids = [str(cid).strip() for cid in update_dict["collection_ids"] if cid]
            update_dict["collection_ids"] = clean_cids
            _sync_product_collections(self.db, product_id, clean_cids)

        update_dict["updated_at"] = datetime.now(timezone.utc)
        updated = self.repo.update(obj_id, update_dict)
        return format_product_response(updated, self.db)

    def update_stock(self, product_id: str, stock_data: StockPatchRequest) -> ProductResponse:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invalid product ID format '{product_id}'."
            )
        obj_id = ObjectId(product_id)
        existing = self.repo.find_by_id(product_id)
        if not existing or existing.get("is_deleted"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{product_id}' not found."
            )

        now = datetime.now(timezone.utc)
        updated = self.repo.update(obj_id, {"stock": stock_data.stock, "updated_at": now})
        return format_product_response(updated)

    def soft_delete(self, product_id: str) -> dict:
        if not ObjectId.is_valid(product_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invalid product ID format '{product_id}'."
            )
        obj_id = ObjectId(product_id)
        existing = self.repo.find_by_id(product_id)
        if not existing or existing.get("is_deleted"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{product_id}' not found."
            )

        now = datetime.now(timezone.utc)
        self.repo.soft_delete(obj_id, now)
        # Also remove this product from any collections it belongs to
        try:
            self.db.collections.update_many({"product_ids": product_id}, {"$pull": {"product_ids": product_id}, "$set": {"updated_at": now.isoformat()}})
        except Exception:
            pass
        return {"status": "success", "message": f"Product '{existing['name']}' soft-deleted successfully."}


# --------------------------------------------------------------------------
# Module-level helper functions for APIRouter endpoints
# --------------------------------------------------------------------------

def create_product(db: Database, data: ProductCreate) -> ProductResponse:
    service = ProductService(db)
    return service.create(data)

def get_product_by_id_or_slug(db: Database, identifier: str) -> ProductResponse:
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product identifier is required."
        )

    service = ProductService(db)
    service._seed_if_empty()

    clean_id = str(identifier).strip()
    slug_lower = clean_id.lower()
    slug_hyphenated = slugify(clean_id)
    sku_upper = clean_id.upper()

    extra = {
        "is_deleted": {"$ne": True},
        "is_active": True,
        "status": "published"
    }

    # 1. Search by Slug (exact, hyphenated, space-separated, or URL-decoded)
    doc = db.products.find_one({
        "slug": {"$in": [slug_lower, slug_hyphenated, slug_lower.replace("%20", "-"), slug_lower.replace("%20", " ")]},
        **extra
    })

    # 2. Search by ObjectId if valid
    if not doc and ObjectId.is_valid(clean_id):
        doc = db.products.find_one({"_id": ObjectId(clean_id), **extra})

    # 3. Search by SKU
    if not doc:
        doc = db.products.find_one({"sku": sku_upper, **extra})

    # 4. Search by legacy integer or string id
    if not doc:
        try:
            numeric_id = int(clean_id)
            doc = db.products.find_one({"id": numeric_id, **extra})
        except ValueError:
            pass

    # 5. Search by Name (case-insensitive fallback)
    if not doc:
        name_query = clean_id.replace("-", " ").replace("%20", " ")
        doc = db.products.find_one({"name": {"$regex": f"^{re.escape(name_query)}$", "$options": "i"}, **extra})

    if not doc:
        # Fallback check without status filters
        doc_any = db.products.find_one({
            "$or": [
                {"slug": {"$in": [slug_lower, slug_hyphenated]}},
                {"sku": sku_upper}
            ]
        })
        if not doc_any and ObjectId.is_valid(clean_id):
            doc_any = db.products.find_one({"_id": ObjectId(clean_id)})

        if doc_any:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{identifier}' is currently unavailable."
            )

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with identifier '{identifier}' not found."
        )

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
    sort_by: Optional[str] = "created_at_desc"
) -> PaginatedProductResponse:
    service = ProductService(db)
    return service.list_products(
        page=page,
        limit=limit,
        search=search,
        category=category,
        min_price=min_price,
        max_price=max_price,
        featured=is_featured,
        new_arrival=is_new_arrival,
        bestseller=is_best_seller,
        status_filter=status_filter,
        sort_by=sort_by
    )

def update_product(db: Database, identifier: str, data: ProductUpdate) -> ProductResponse:
    service = ProductService(db)
    if ObjectId.is_valid(identifier):
        return service.update(identifier, data)
    
    doc = db.products.find_one({"$or": [{"slug": identifier.lower()}, {"sku": identifier.upper()}]})
    if doc:
        return service.update(str(doc["_id"]), data)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Product '{identifier}' not found for update."
    )

def delete_product(db: Database, identifier: str, hard_delete: bool = False) -> dict:
    service = ProductService(db)
    obj_id_str = identifier
    if not ObjectId.is_valid(identifier):
        doc = db.products.find_one({"$or": [{"slug": identifier.lower()}, {"sku": identifier.upper()}]})
        if doc:
            obj_id_str = str(doc["_id"])
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{identifier}' not found for deletion."
            )
    return service.soft_delete(obj_id_str)

