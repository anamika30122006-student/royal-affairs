import re
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from pymongo.database import Database
from fastapi import HTTPException, status
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

def slugify(text: str) -> str:
    """Generate a clean URL-friendly slug from text."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')

def format_category_response(doc: dict, db: Optional[Database] = None) -> CategoryResponse:
    """Format MongoDB category document to CategoryResponse Pydantic schema."""
    cat_name = doc.get("name", "")
    prod_count = 0
    if db is not None and cat_name:
        prod_count = db.products.count_documents({"category": cat_name, "is_deleted": {"$ne": True}})

    return CategoryResponse(
        id=str(doc["_id"]),
        name=doc.get("name", ""),
        slug=doc.get("slug", ""),
        description=doc.get("description"),
        image_url=doc.get("image_url"),
        is_active=doc.get("is_active", True),
        product_count=prod_count,
        created_at=doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        updated_at=doc.get("updated_at").isoformat() if isinstance(doc.get("updated_at"), datetime) else str(doc.get("updated_at", ""))
    )

def create_category(db: Database, data: CategoryCreate) -> CategoryResponse:
    """Create a new category (Admin Only)."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    slug = data.slug.strip() if data.slug else slugify(data.name)

    # Check for duplicate name or slug
    if db.categories.find_one({"$or": [{"name": data.name.strip()}, {"slug": slug}]}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{data.name}' or slug '{slug}' already exists."
        )

    now = datetime.now(timezone.utc)
    cat_doc = {
        "name": data.name.strip(),
        "slug": slug,
        "description": data.description.strip() if data.description else None,
        "image_url": data.image_url.strip() if data.image_url else None,
        "is_active": data.is_active,
        "created_at": now,
        "updated_at": now
    }

    result = db.categories.insert_one(cat_doc)
    cat_doc["_id"] = result.inserted_id
    return format_category_response(cat_doc, db)

def get_categories(db: Database, include_inactive: bool = False) -> List[CategoryResponse]:
    """Retrieve all categories."""
    if db is None:
        return []

    query = {} if include_inactive else {"is_active": True}
    docs = list(db.categories.find(query).sort("name", 1))
    return [format_category_response(doc, db) for doc in docs]

def get_category_by_id_or_slug(db: Database, identifier: str) -> CategoryResponse:
    """Find category by ObjectId string or by slug."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    doc = None
    if ObjectId.is_valid(identifier):
        doc = db.categories.find_one({"_id": ObjectId(identifier)})

    if not doc:
        doc = db.categories.find_one({"slug": identifier.lower()})

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Category '{identifier}' not found.")

    return format_category_response(doc, db)

def update_category(db: Database, identifier: str, data: CategoryUpdate) -> CategoryResponse:
    """Update category details (Admin Only)."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    cat_resp = get_category_by_id_or_slug(db, identifier)
    cat_id = ObjectId(cat_resp.id)

    update_dict = {}
    if data.name is not None:
        update_dict["name"] = data.name.strip()
    if data.slug is not None:
        update_dict["slug"] = slugify(data.slug)
    elif data.name is not None and data.slug is None:
        update_dict["slug"] = slugify(data.name)
    if data.description is not None:
        update_dict["description"] = data.description.strip()
    if data.image_url is not None:
        update_dict["image_url"] = data.image_url.strip()
    if data.is_active is not None:
        update_dict["is_active"] = data.is_active

    if not update_dict:
        return cat_resp

    # Check for duplicate slug if slug is changing
    if "slug" in update_dict:
        dup = db.categories.find_one({"slug": update_dict["slug"], "_id": {"$ne": cat_id}})
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category slug '{update_dict['slug']}' is already in use."
            )

    update_dict["updated_at"] = datetime.now(timezone.utc)
    db.categories.update_one({"_id": cat_id}, {"$set": update_dict})

    updated_doc = db.categories.find_one({"_id": cat_id})
    return format_category_response(updated_doc, db)

def delete_category(db: Database, identifier: str) -> dict:
    """Delete a category (Admin Only)."""
    if db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    cat_resp = get_category_by_id_or_slug(db, identifier)
    db.categories.delete_one({"_id": ObjectId(cat_resp.id)})
    return {"status": "success", "message": f"Category '{cat_resp.name}' deleted successfully."}
