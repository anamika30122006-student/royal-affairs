import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from bson import ObjectId
from pymongo.database import Database
from fastapi import HTTPException, status
from app.schemas.collection import CollectionCreate, CollectionUpdate

def generate_slug(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug)
    return slug

def serialize_collection(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return {}
    doc["id"] = str(doc.get("_id", ""))
    if "_id" in doc:
        del doc["_id"]
    
    product_ids = doc.get("product_ids", [])
    doc["product_ids"] = [str(pid) for pid in product_ids]
    doc["product_count"] = len(doc["product_ids"])
    doc["is_active"] = doc.get("is_active", True)
    doc["display_order"] = doc.get("display_order", 0)
    doc["collection_type"] = doc.get("collection_type", "custom")
    return doc

def seed_default_collections(db: Database):
    """Seed initial storefront collections if none exist."""
    collections_coll = db["collections"]
    if collections_coll.count_documents({}) > 0:
        return

    products_coll = db["products"]
    all_products = list(products_coll.find({"is_deleted": {"$ne": True}}))
    all_pids = [str(p["_id"]) for p in all_products]

    # Categorize products for initial seeding
    new_arrival_pids = [str(p["_id"]) for p in all_products if p.get("newArrival") or p.get("new_arrival")]
    trending_pids = [str(p["_id"]) for p in all_products if p.get("rating", 0) >= 4.7 or p.get("reviewCount", 0) > 20]
    bestseller_pids = [str(p["_id"]) for p in all_products if p.get("bestseller") or p.get("is_bestseller")]
    featured_pids = [str(p["_id"]) for p in all_products if p.get("featured") or p.get("is_featured")]

    # If any specific lists are empty, fallback to available product IDs
    if not new_arrival_pids: new_arrival_pids = all_pids[:4]
    if not trending_pids: trending_pids = all_pids[:4]
    if not bestseller_pids: bestseller_pids = all_pids[:4]
    if not featured_pids: featured_pids = all_pids[:4]

    default_records = [
        {
          "name": "New Arrivals",
          "slug": "new-arrivals",
          "description": "Discover our latest seasonal designer suits and handcrafted luxury wear.",
          "image": "./assets/images/hero_slide_1.png",
          "is_active": True,
          "display_order": 1,
          "collection_type": "new_arrivals",
          "product_ids": new_arrival_pids,
          "created_at": datetime.now(timezone.utc).isoformat(),
          "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
          "name": "Trending Products",
          "slug": "trending-products",
          "description": "Most loved Pakistani and silk suits styled by our fashion community.",
          "image": "./assets/images/hero_slide_2.png",
          "is_active": True,
          "display_order": 2,
          "collection_type": "trending",
          "product_ids": trending_pids,
          "created_at": datetime.now(timezone.utc).isoformat(),
          "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
          "name": "Bestsellers",
          "slug": "bestsellers",
          "description": "Top customer favorites in handcrafted Anarkali, Sharara & Kurta sets.",
          "image": "./assets/images/hero_slide_3_red_palace.png",
          "is_active": True,
          "display_order": 3,
          "collection_type": "bestsellers",
          "product_ids": bestseller_pids,
          "created_at": datetime.now(timezone.utc).isoformat(),
          "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
          "name": "Featured Collection",
          "slug": "featured-collection",
          "description": "Curated royal heritage suits for weddings and festive celebrations.",
          "image": "./assets/images/promo_festive_elegance.png",
          "is_active": True,
          "display_order": 4,
          "collection_type": "featured",
          "product_ids": featured_pids,
          "created_at": datetime.now(timezone.utc).isoformat(),
          "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]

    collections_coll.insert_many(default_records)

def get_all_collections(db: Database, include_inactive: bool = False) -> List[Dict[str, Any]]:
    seed_default_collections(db)
    query = {} if include_inactive else {"is_active": True}
    records = list(db["collections"].find(query).sort("display_order", 1))
    results = []
    products_coll = db["products"]
    for r in records:
        # compute visible product count (not deleted, active, published)
        pid_list = r.get("product_ids", []) or []
        obj_ids = []
        for pid in pid_list:
            if ObjectId.is_valid(pid):
                obj_ids.append(ObjectId(pid))
        visible_count = products_coll.count_documents({"_id": {"$in": obj_ids}, "is_deleted": False, "is_active": True, "status": "published"}) if obj_ids else 0
        serialized = serialize_collection(r)
        serialized["product_count"] = visible_count
        results.append(serialized)
    return results

def get_collection_by_id_or_slug(db: Database, id_or_slug: str) -> Dict[str, Any]:
    collections_coll = db["collections"]
    doc = None
    if ObjectId.is_valid(id_or_slug):
        doc = collections_coll.find_one({"_id": ObjectId(id_or_slug)})
    if not doc:
        doc = collections_coll.find_one({"slug": id_or_slug.lower()})
    if not doc:
        doc = collections_coll.find_one({"name": {"$regex": f"^{re.escape(id_or_slug)}$", "$options": "i"}})
    if not doc:
        raise HTTPException(status_code=404, detail="Collection not found")
    return serialize_collection(doc)

from app.services.product_service import format_product_response

def get_collection_with_products(db: Database, id_or_slug: str) -> Dict[str, Any]:
    col = get_collection_by_id_or_slug(db, id_or_slug)
    product_ids = col.get("product_ids", [])
    
    # Fetch populated product documents from products collection
    products_coll = db["products"]
    product_docs = []
    
    for pid in product_ids:
        p_doc = None
        if ObjectId.is_valid(pid):
            p_doc = products_coll.find_one({"_id": ObjectId(pid), "is_deleted": False, "is_active": True, "status": "published"})
        if not p_doc:
            p_doc = products_coll.find_one({"slug": pid, "is_deleted": False, "is_active": True, "status": "published"})
        if p_doc:
            formatted_p = format_product_response(p_doc).model_dump()
            product_docs.append(formatted_p)
            
    col["products"] = product_docs
    # update visible product_count
    col["product_count"] = len(product_docs)
    return col



def _sync_collection_products(db: Database, collection_id_str: str, product_ids: List[str]):
    if db is None or not collection_id_str:
        return
    clean_pids = [str(pid).strip() for pid in (product_ids or []) if pid and str(pid).strip()]

    # Add collection_id_str to specified products' collection_ids
    for pid in clean_pids:
        query = {"_id": ObjectId(pid)} if ObjectId.is_valid(pid) else {"slug": pid}
        db.products.update_one(query, {"$addToSet": {"collection_ids": collection_id_str}})

    # Pull collection_id_str from products not in clean_pids
    obj_pids = [ObjectId(pid) for pid in clean_pids if ObjectId.is_valid(pid)]
    slug_pids = [pid for pid in clean_pids if not ObjectId.is_valid(pid)]

    unmatch_query = {
        "_id": {"$nin": obj_pids},
        "slug": {"$nin": slug_pids},
        "collection_ids": collection_id_str
    }
    db.products.update_many(unmatch_query, {"$pull": {"collection_ids": collection_id_str}})


def add_products_to_collection(db: Database, collection_id: str, product_ids: List[str]) -> Dict[str, Any]:
    collections_coll = db["collections"]
    if not ObjectId.is_valid(collection_id):
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    obj_id = ObjectId(collection_id)
    existing = collections_coll.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Collection not found")
    current = existing.get("product_ids", []) or []
    for pid in product_ids:
        if pid not in current:
            current.append(pid)
    # Enforce max 4 products per collection for storefront display
    current = current[:4]
    collections_coll.update_one({"_id": obj_id}, {"$set": {"product_ids": current, "updated_at": datetime.now(timezone.utc).isoformat()}})
    _sync_collection_products(db, str(obj_id), current)
    res = collections_coll.find_one({"_id": obj_id})
    return serialize_collection(res)


def remove_product_from_collection(db: Database, collection_id: str, product_id: str) -> Dict[str, Any]:
    collections_coll = db["collections"]
    if not ObjectId.is_valid(collection_id):
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    obj_id = ObjectId(collection_id)
    res = collections_coll.find_one_and_update({"_id": obj_id}, {"$pull": {"product_ids": product_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Collection not found")
    # Pull collection_id from product
    p_query = {"_id": ObjectId(product_id)} if ObjectId.is_valid(product_id) else {"slug": product_id}
    db.products.update_one(p_query, {"$pull": {"collection_ids": str(obj_id)}})
    return serialize_collection(res)


def replace_collection_products(db: Database, collection_id: str, product_ids: List[str]) -> Dict[str, Any]:
    collections_coll = db["collections"]
    if not ObjectId.is_valid(collection_id):
        raise HTTPException(status_code=400, detail="Invalid collection ID")
    obj_id = ObjectId(collection_id)
    clean_pids = (product_ids or [])[:4]
    res = collections_coll.find_one_and_update({"_id": obj_id}, {"$set": {"product_ids": clean_pids, "updated_at": datetime.now(timezone.utc).isoformat()}}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Collection not found")
    _sync_collection_products(db, str(obj_id), clean_pids)
    return serialize_collection(res)

def create_collection(db: Database, data: CollectionCreate) -> Dict[str, Any]:
    collections_coll = db["collections"]
    
    slug = data.slug or generate_slug(data.name)
    existing = collections_coll.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"

    clean_pids = (data.product_ids or [])[:4]
    doc = {
        "name": data.name,
        "slug": slug,
        "description": data.description,
        "image": data.image,
        "is_active": data.is_active,
        "display_order": data.display_order,
        "collection_type": data.collection_type or "custom",
        "product_ids": clean_pids,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    result = collections_coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    col_id_str = str(result.inserted_id)
    _sync_collection_products(db, col_id_str, clean_pids)
    return serialize_collection(doc)

def update_collection(db: Database, collection_id: str, data: CollectionUpdate) -> Dict[str, Any]:
    collections_coll = db["collections"]
    
    if not ObjectId.is_valid(collection_id):
        raise HTTPException(status_code=400, detail="Invalid collection ID")

    update_dict = {}
    payload = data.model_dump(exclude_unset=True)

    for field, val in payload.items():
        if val is not None:
            if field == "product_ids":
                update_dict["product_ids"] = val[:4]
            else:
                update_dict[field] = val

    if "name" in update_dict and "slug" not in update_dict:
        update_dict["slug"] = generate_slug(update_dict["name"])

    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    res = collections_coll.find_one_and_update(
        {"_id": ObjectId(collection_id)},
        {"$set": update_dict},
        return_document=True
    )

    if not res:
        raise HTTPException(status_code=404, detail="Collection not found")

    if "product_ids" in update_dict:
        _sync_collection_products(db, collection_id, update_dict["product_ids"])

    return serialize_collection(res)


def delete_collection(db: Database, collection_id: str) -> Dict[str, Any]:
    collections_coll = db["collections"]
    if not ObjectId.is_valid(collection_id):
        raise HTTPException(status_code=400, detail="Invalid collection ID")

    res = collections_coll.find_one_and_delete({"_id": ObjectId(collection_id)})
    if not res:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"message": "Collection deleted successfully", "id": collection_id}
