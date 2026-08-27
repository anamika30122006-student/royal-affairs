import re
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from pymongo.database import Database
from pymongo import ASCENDING
from fastapi import HTTPException, status
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.repositories.category_repository import CategoryRepository

SEED_CATEGORIES = [
    {
        "name": "Anarkali Suits",
        "slug": "anarkali-suits",
        "description": "Heavily embroidered flared velvet and silk Anarkalis",
        "image": "./assets/images/anarkali_maroon.jpg",
        "display_order": 1,
        "is_active": True,
        "show_on_home": True,
        "home_display_order": 1
    },
    {
        "name": "Sharara Sets",
        "slug": "sharara-sets",
        "description": "Rich plum embroidered shararas with multi-tiered flared pants",
        "image": "./assets/images/sharara_plum.jpg",
        "display_order": 2,
        "is_active": True,
        "show_on_home": True,
        "home_display_order": 2
    },
    {
        "name": "Salwar Kameez",
        "slug": "salwar-kameez",
        "description": "Classic raw silk straight kameez with intricate embroidery",
        "image": "./assets/images/kameez_ivory.jpg",
        "display_order": 3,
        "is_active": True,
        "show_on_home": True,
        "home_display_order": 3
    },
    {
        "name": "Palazzo Suits",
        "slug": "palazzo-suits",
        "description": "Luxe Banarasi silk kurtas with wide-leg embroidered palazzos",
        "image": "./assets/images/palazzo_gold.jpg",
        "display_order": 4,
        "is_active": True,
        "show_on_home": True,
        "home_display_order": 4
    },
    {
        "name": "Pakistani Suits",
        "slug": "pakistani-suits",
        "description": "Traditional straight Pakistani suits with lace embroidery",
        "image": "./assets/images/image copy.png",
        "display_order": 5,
        "is_active": True,
        "show_on_home": False,
        "home_display_order": 0
    },
    {
        "name": "Lehenga Suits",
        "slug": "lehenga-suits",
        "description": "Royal wedding bridal lehenga suit sets",
        "image": "./assets/images/promo_bridal_wedding.png",
        "display_order": 6,
        "is_active": True,
        "show_on_home": False,
        "home_display_order": 0
    }
]

def slugify(text: str) -> str:
    """Generate a clean URL-friendly slug from text."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')

def format_category_response(doc: dict, db: Optional[Database] = None) -> CategoryResponse:
    """Format MongoDB category document to CategoryResponse Pydantic schema with cover image priority resolution."""
    cat_id_str = str(doc["_id"])
    cat_slug = doc.get("slug", "")
    cat_name = doc.get("name", "")

    product_count = 0
    resolved_image = doc.get("image")

    if db is not None:
        try:
            category_query = {
                "$or": [
                    {"category_id": cat_id_str},
                    {"category_id": cat_slug},
                    {"category_id": cat_name}
                ],
                "is_deleted": False,
                "is_active": True,
                "status": "published"
            }

            product_count = db.products.count_documents(category_query)

            # Image resolution priority:
            # 1. Category Cover Image (doc.get("image"))
            # 2. Featured Product Image in Category
            # 3. First Product Image in Category
            # 4. Default Placeholder by Slug
            if not resolved_image or not str(resolved_image).strip():
                featured_prod = db.products.find_one({**category_query, "featured": True})
                if featured_prod:
                    resolved_image = featured_prod.get("thumbnail") or (featured_prod.get("images")[0] if featured_prod.get("images") else None)

                if not resolved_image or not str(resolved_image).strip():
                    first_prod = db.products.find_one(category_query)
                    if first_prod:
                        resolved_image = first_prod.get("thumbnail") or (first_prod.get("images")[0] if first_prod.get("images") else None)

        except Exception:
            product_count = 0

    if not resolved_image or not str(resolved_image).strip():
        slug_lower = cat_slug.lower()
        if "anarkali" in slug_lower:
            resolved_image = "./assets/images/anarkali_maroon.jpg"
        elif "sharara" in slug_lower:
            resolved_image = "./assets/images/sharara_plum.jpg"
        elif "kameez" in slug_lower or "salwar" in slug_lower:
            resolved_image = "./assets/images/kameez_ivory.jpg"
        elif "palazzo" in slug_lower:
            resolved_image = "./assets/images/palazzo_gold.jpg"
        elif "pakistani" in slug_lower:
            resolved_image = "./assets/images/image copy.png"
        elif "lehenga" in slug_lower or "bridal" in slug_lower:
            resolved_image = "./assets/images/promo_bridal_wedding.png"
        else:
            resolved_image = "./assets/images/anarkali_maroon.jpg"

    return CategoryResponse(
        id=cat_id_str,
        name=cat_name,
        slug=cat_slug,
        description=doc.get("description"),
        image=resolved_image,
        display_order=int(doc.get("display_order", 0)),
        product_count=product_count,
        is_active=doc.get("is_active", True),
        show_on_home=doc.get("show_on_home", False),
        home_display_order=int(doc.get("home_display_order", 0)),
        created_at=doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        updated_at=doc.get("updated_at").isoformat() if isinstance(doc.get("updated_at"), datetime) else str(doc.get("updated_at", ""))
    )

class CategoryService:
    def __init__(self, db: Database):
        self.repo = CategoryRepository(db)
        self.db = db

    def _seed_if_empty(self):
        try:
            if self.db is not None and self.db.categories.count_documents({}) == 0:
                now = datetime.now(timezone.utc)
                for cat in SEED_CATEGORIES:
                    c = cat.copy()
                    c["created_at"] = now
                    c["updated_at"] = now
                    self.db.categories.insert_one(c)
        except Exception:
            pass

    def create(self, data: CategoryCreate) -> CategoryResponse:
        slug = data.slug.strip().lower() if data.slug else slugify(data.name)

        if self.repo.find_by_slug(slug) or self.repo.find_by_name(data.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category with name '{data.name}' or slug '{slug}' already exists."
            )

        now = datetime.now(timezone.utc)
        cat_doc = {
            "name": data.name.strip(),
            "slug": slug,
            "description": data.description.strip() if data.description else None,
            "image": data.image.strip() if data.image else None,
            "display_order": data.display_order,
            "is_active": data.is_active,
            "show_on_home": data.show_on_home,
            "home_display_order": data.home_display_order,
            "created_at": now,
            "updated_at": now
        }

        created = self.repo.insert(cat_doc)
        return format_category_response(created, self.db)

    def get_all(self, include_inactive: bool = False) -> List[CategoryResponse]:
        self._seed_if_empty()
        query = {} if include_inactive else {"is_active": True}
        docs = list(self.db.categories.find(query).sort([("display_order", ASCENDING), ("name", ASCENDING)]))
        return [format_category_response(d, self.db) for d in docs]

    def get_by_slug(self, slug: str, public_only: bool = True) -> CategoryResponse:
        self._seed_if_empty()
        doc = self.repo.find_by_slug(slug)
        if not doc or (public_only and not doc.get("is_active", True)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with slug '{slug}' not found."
            )
        return format_category_response(doc, self.db)

    def get_by_id(self, category_id: str) -> CategoryResponse:
        self._seed_if_empty()
        if not ObjectId.is_valid(category_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invalid category ID format '{category_id}'."
            )
        doc = self.repo.find_by_id(category_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with ID '{category_id}' not found."
            )
        return format_category_response(doc, self.db)

    def update(self, category_id: str, data: CategoryUpdate) -> CategoryResponse:
        if not ObjectId.is_valid(category_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invalid category ID format '{category_id}'."
            )
        obj_id = ObjectId(category_id)
        existing = self.repo.find_by_id(category_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with ID '{category_id}' not found."
            )

        update_dict = {}
        if data.name is not None:
            update_dict["name"] = data.name.strip()
        if data.slug is not None:
            update_dict["slug"] = slugify(data.slug)
        elif data.name is not None and data.slug is None:
            update_dict["slug"] = slugify(data.name)
        if data.description is not None:
            update_dict["description"] = data.description.strip()
        if data.image is not None:
            update_dict["image"] = data.image.strip()
        if data.display_order is not None:
            update_dict["display_order"] = data.display_order
        if data.is_active is not None:
            update_dict["is_active"] = data.is_active
        if data.show_on_home is not None:
            update_dict["show_on_home"] = data.show_on_home
        if data.home_display_order is not None:
            update_dict["home_display_order"] = data.home_display_order

        if not update_dict:
            return format_category_response(existing, self.db)

        # Check duplicate slug if slug is changing
        if "slug" in update_dict:
            dup = self.db.categories.find_one({"slug": update_dict["slug"], "_id": {"$ne": obj_id}})
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Category slug '{update_dict['slug']}' is already in use."
                )

        update_dict["updated_at"] = datetime.now(timezone.utc)
        updated = self.repo.update(obj_id, update_dict)
        return format_category_response(updated, self.db)

    def delete(self, category_id: str) -> dict:
        if not ObjectId.is_valid(category_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invalid category ID format '{category_id}'."
            )
        obj_id = ObjectId(category_id)
        existing = self.repo.find_by_id(category_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with ID '{category_id}' not found."
            )

        self.repo.delete(obj_id)
        return {"status": "success", "message": f"Category '{existing['name']}' deleted successfully."}
