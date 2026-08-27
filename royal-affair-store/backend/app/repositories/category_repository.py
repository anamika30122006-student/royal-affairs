from bson import ObjectId
from pymongo.database import Database
from typing import Optional, List, Dict, Any

class CategoryRepository:
    def __init__(self, db: Database):
        self.db = db

    def find_by_id(self, category_id: str) -> Optional[dict]:
        if not ObjectId.is_valid(category_id):
            return None
        return self.db.categories.find_one({"_id": ObjectId(category_id)})

    def find_by_slug(self, slug: str) -> Optional[dict]:
        return self.db.categories.find_one({"slug": slug.lower().strip()})

    def find_by_name(self, name: str) -> Optional[dict]:
        return self.db.categories.find_one({"name": name.strip()})

    def get_all(self, query: dict) -> List[dict]:
        return list(self.db.categories.find(query).sort("name", 1))

    def insert(self, category_doc: dict) -> dict:
        result = self.db.categories.insert_one(category_doc)
        category_doc["_id"] = result.inserted_id
        return category_doc

    def update(self, category_id: ObjectId, update_doc: dict) -> Optional[dict]:
        self.db.categories.update_one({"_id": category_id}, {"$set": update_doc})
        return self.db.categories.find_one({"_id": category_id})

    def delete(self, category_id: ObjectId) -> bool:
        res = self.db.categories.delete_one({"_id": category_id})
        return res.deleted_count > 0
