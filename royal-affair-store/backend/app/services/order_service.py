import random
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from pymongo.database import Database
from pymongo import DESCENDING
from fastapi import HTTPException, status
from app.schemas.order import OrderCreateSchema, OrderStatusUpdateSchema, OrderResponseSchema, PaginatedOrderResponseSchema

def format_order_response(doc: dict) -> OrderResponseSchema:
    order_id_str = str(doc.get("_id"))
    order_num = doc.get("order_number") or doc.get("order_id") or f"RA-{order_id_str[-6:].upper()}"
    
    items = []
    for item in doc.get("items", []):
        qty_val = item.get("quantity") or item.get("qty") or 1
        items.append({
            "product_id": str(item.get("product_id", "")),
            "slug": item.get("slug", ""),
            "name": item.get("name", "Royal Suit"),
            "sku": item.get("sku", ""),
            "price": float(item.get("price", 0.0)),
            "quantity": qty_val,
            "qty": qty_val,
            "size": item.get("size", "M"),
            "color": item.get("color", "Default"),
            "image": item.get("image", "")
        })

    return OrderResponseSchema(
        id=order_num,
        order_number=order_num,
        customer_name=doc.get("customer_name", "Guest"),
        customer_email=doc.get("customer_email", ""),
        customer_phone=doc.get("customer_phone"),
        shipping_address=doc.get("shipping_address", ""),
        delivery_method=doc.get("delivery_method", "standard"),
        payment_method=doc.get("payment_method", "UPI"),
        payment_status=doc.get("payment_status", "Paid"),
        status=(str(doc.get("status", "processing")).capitalize()),
        items=items,
        subtotal=float(doc.get("subtotal", 0.0)),
        discount=float(doc.get("discount", 0.0)),
        shipping_fee=float(doc.get("shipping_fee", 0.0)),
        total_amount=float(doc.get("total_amount", 0.0)),
        notes=doc.get("notes"),
        razorpay_order_id=doc.get("razorpay_order_id"),
        razorpay_payment_id=doc.get("razorpay_payment_id"),
        created_at=doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        updated_at=doc.get("updated_at").isoformat() if isinstance(doc.get("updated_at"), datetime) else str(doc.get("updated_at", ""))
    )

class OrderService:
    def __init__(self, db: Database):
        self.db = db

    def create(self, data: OrderCreateSchema) -> OrderResponseSchema:
        now = datetime.now(timezone.utc)
        order_num = data.order_id or f"RA-{random.randint(100000, 999999)}"

        items_docs = []
        for item in data.items:
            qty_val = item.quantity or item.qty or 1
            item_dict = {
                "product_id": str(item.product_id) if item.product_id else None,
                "slug": item.slug,
                "name": item.name,
                "sku": item.sku,
                "price": float(item.price),
                "quantity": qty_val,
                "qty": qty_val,
                "size": item.size,
                "color": item.color,
                "image": item.image
            }
            items_docs.append(item_dict)

            # Reduce product stock in database
            self._decrement_product_stock(item.product_id, item.slug, qty_val)

        order_doc = {
            "order_number": order_num,
            "order_id": order_num,
            "customer_name": data.customer_name.strip(),
            "customer_email": data.customer_email.strip().lower(),
            "customer_phone": data.customer_phone.strip(),
            "shipping_address": data.shipping_address.strip(),
            "delivery_method": data.delivery_method or "standard",
            "payment_method": data.payment_method.strip(),
            "payment_status": data.payment_status or ("Paid" if data.payment_method != "COD" else "Pending"),
            "status": "processing",
            "items": items_docs,
            "subtotal": float(data.subtotal),
            "discount": float(data.discount),
            "shipping_fee": float(data.shipping_fee),
            "total_amount": float(data.total_amount),
            "created_at": now,
            "updated_at": now
        }

        res = self.db.orders.insert_one(order_doc)
        order_doc["_id"] = res.inserted_id
        return format_order_response(order_doc)

    def _decrement_product_stock(self, product_id: Optional[str], slug: Optional[str], qty: int):
        """Reduces stock of product in database safely."""
        query = None
        if product_id and ObjectId.is_valid(product_id):
            query = {"_id": ObjectId(product_id)}
        elif slug:
            query = {"slug": slug.strip().lower()}

        if not query:
            return

        prod = self.db.products.find_one(query)
        if prod:
            current_stock = int(prod.get("stock", 0))
            new_stock = max(0, current_stock - qty)
            self.db.products.update_one({"_id": prod["_id"]}, {"$set": {"stock": new_stock, "updated_at": datetime.now(timezone.utc)}})

    def list_orders(self, page: int = 1, limit: int = 20) -> PaginatedOrderResponseSchema:
        total = self.db.orders.count_documents({})
        total_pages = max(1, (total + limit - 1) // limit)
        skip = (page - 1) * limit

        cursor = self.db.orders.find({}).sort("created_at", DESCENDING).skip(skip).limit(limit)
        orders = [format_order_response(doc) for doc in cursor]

        return PaginatedOrderResponseSchema(
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            orders=orders
        )

    def list_orders_by_email(self, email: str, page: int = 1, limit: int = 20) -> PaginatedOrderResponseSchema:
        clean_email = str(email).strip().lower()
        query = {"customer_email": clean_email}
        total = self.db.orders.count_documents(query)
        total_pages = max(1, (total + limit - 1) // limit)
        skip = (page - 1) * limit

        cursor = self.db.orders.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit)
        orders = [format_order_response(doc) for doc in cursor]

        return PaginatedOrderResponseSchema(
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            orders=orders
        )

    def get_order_by_identifier(self, identifier: str) -> OrderResponseSchema:
        clean = str(identifier).strip()
        doc = self.db.orders.find_one({"$or": [{"order_number": clean}, {"order_id": clean}]})
        if not doc and ObjectId.is_valid(clean):
            doc = self.db.orders.find_one({"_id": ObjectId(clean)})

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{identifier}' not found."
            )
        return format_order_response(doc)

    def update_status(self, identifier: str, data: OrderStatusUpdateSchema) -> OrderResponseSchema:
        clean = str(identifier).strip()
        doc = self.db.orders.find_one({"$or": [{"order_number": clean}, {"order_id": clean}]})
        if not doc and ObjectId.is_valid(clean):
            doc = self.db.orders.find_one({"_id": ObjectId(clean)})

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{identifier}' not found for update."
            )

        # Validate provided status against allowed tracking states
        allowed = {"confirmed", "processing", "shipped", "delivered", "cancelled"}
        status_norm = str(data.status).strip().lower()
        if status_norm not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{data.status}'. Allowed: Confirmed, Processing, Shipped, Delivered, Cancelled.")

        now = datetime.now(timezone.utc)
        update_fields = {
            # store standardized lower-case status internally but clients receive consistent title-case
            "status": status_norm,
            "updated_at": now
        }
        if data.notes:
            update_fields["notes"] = data.notes

        if status_norm == "delivered":
            update_fields["payment_status"] = "Paid"

        self.db.orders.update_one({"_id": doc["_id"]}, {"$set": update_fields})
        updated = self.db.orders.find_one({"_id": doc["_id"]})
        return format_order_response(updated)
