from bson import ObjectId
from pymongo.database import Database
from typing import Optional, List, Dict, Any

class ProductRepository:
    def __init__(self, db: Database):
        self.db = db

    def find_by_id(self, product_id: str, query_extra: Optional[dict] = None) -> Optional[dict]:
        if not ObjectId.is_valid(product_id):
            return None
        q = {"_id": ObjectId(product_id)}
        if query_extra:
            q.update(query_extra)
        return self.db.products.find_one(q)

    def find_by_slug(self, slug: str, query_extra: Optional[dict] = None) -> Optional[dict]:
        q = {"slug": slug.lower().strip()}
        if query_extra:
            q.update(query_extra)
        return self.db.products.find_one(q)

    def find_by_sku(self, sku: str, query_extra: Optional[dict] = None) -> Optional[dict]:
        import re
        q = {"sku": {"$regex": f"^{re.escape(sku.strip())}$", "$options": "i"}}
        if query_extra:
            q.update(query_extra)
        return self.db.products.find_one(q)

    def count(self, query: dict) -> int:
        return self.db.products.count_documents(query)

    def find_paginated(self, query: dict, sort_spec: list, skip: int, limit: int) -> List[dict]:
        return list(self.db.products.find(query).sort(sort_spec).skip(skip).limit(limit))

    def insert(self, product_doc: dict) -> dict:
        result = self.db.products.insert_one(product_doc)
        product_doc["_id"] = result.inserted_id
        return product_doc

    def update(self, product_id: ObjectId, update_doc: dict) -> Optional[dict]:
        self.db.products.update_one({"_id": product_id}, {"$set": update_doc})
        return self.db.products.find_one({"_id": product_id})

    def soft_delete(self, product_id: ObjectId, timestamp: Any) -> bool:
        res = self.db.products.update_one({"_id": product_id}, {"$set": {"is_deleted": True, "updated_at": timestamp}})
        return res.modified_count > 0
