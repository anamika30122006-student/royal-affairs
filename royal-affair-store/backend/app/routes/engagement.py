from datetime import datetime, timezone
from typing import List, Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, EmailStr, Field
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.dependencies import get_current_admin, get_db
from app.utils.file_upload import save_review_image
from app.services.email_service import email_is_configured, send_enquiry_emails, send_enquiry_reply

public_router = APIRouter(tags=["Customer Engagement"])
admin_router = APIRouter(prefix="/admin", tags=["Admin Customer Engagement"])


def serialize(document: dict) -> dict:
    result = dict(document)
    result["id"] = str(result.pop("_id"))
    for key, value in list(result.items()):
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=404, detail="Record not found.")
    return ObjectId(value)


class EnquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    enquiry_type: str = Field("general", max_length=30)


class ReviewCreate(BaseModel):
    product_id: str
    product_name: str = Field(..., min_length=1, max_length=200)
    product_image: Optional[str] = None
    customer_name: str = Field(..., min_length=2, max_length=120)
    customer_email: Optional[EmailStr] = None
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=150)
    comment: str = Field(..., min_length=5, max_length=3000)
    images: List[str] = Field(default_factory=list, max_length=3)


class ReviewStatusUpdate(BaseModel):
    status: Literal["pending", "approved", "rejected"]


class CouponPayload(BaseModel):
    code: str = Field(..., min_length=2, max_length=40)
    discount_type: Literal["percentage", "fixed"]
    discount_value: float = Field(..., gt=0)
    min_spend: float = Field(0, ge=0)
    expiry_date: Optional[str] = None
    usage_limit: Optional[int] = Field(None, ge=1)
    is_active: bool = True


class CouponValidate(BaseModel):
    code: str
    subtotal: float = Field(..., ge=0)


class ReplyPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)


@public_router.post("/enquiries", status_code=status.HTTP_201_CREATED)
def create_enquiry(payload: EnquiryCreate, background_tasks: BackgroundTasks, db: Database = Depends(get_db)):
    doc = payload.model_dump()
    doc.update(status="unread", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    doc["email"] = str(payload.email).lower()
    doc["_id"] = db.enquiries.insert_one(doc).inserted_id
    result = serialize(doc)
    background_tasks.add_task(send_enquiry_emails, result)
    result["email_queued"] = email_is_configured()
    return result


@public_router.post("/reviews", status_code=status.HTTP_201_CREATED)
def create_review(payload: ReviewCreate, db: Database = Depends(get_db)):
    doc = payload.model_dump()
    if doc.get("customer_email"):
        doc["customer_email"] = str(doc["customer_email"]).lower()
    doc.update(status="pending", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    doc["_id"] = db.reviews.insert_one(doc).inserted_id
    return serialize(doc)


@public_router.post("/reviews/upload-image", status_code=status.HTTP_201_CREATED)
async def upload_review_image(file: UploadFile = File(...)):
    safe_name, _ = await save_review_image(file)
    return {"success": True, "url": f"/uploads/reviews/{safe_name}"}


@public_router.get("/reviews/product/{product_id}")
def product_reviews(product_id: str, db: Database = Depends(get_db)):
    return [serialize(x) for x in db.reviews.find({"product_id": product_id, "status": "approved"}).sort("created_at", -1)]


@public_router.post("/coupons/validate")
def validate_coupon(payload: CouponValidate, db: Database = Depends(get_db)):
    coupon = db.coupons.find_one({"code": payload.code.strip().upper()})
    today = datetime.now(timezone.utc).date().isoformat()
    if not coupon or not coupon.get("is_active", False):
        raise HTTPException(400, "Invalid or inactive coupon code.")
    if coupon.get("expiry_date") and coupon["expiry_date"] < today:
        raise HTTPException(400, "This coupon has expired.")
    if payload.subtotal < float(coupon.get("min_spend", 0)):
        raise HTTPException(400, f"Minimum purchase of ₹{coupon.get('min_spend', 0):g} required.")
    if coupon.get("usage_limit") and coupon.get("usage_count", 0) >= coupon["usage_limit"]:
        raise HTTPException(400, "This coupon has reached its usage limit.")
    discount = payload.subtotal * coupon["discount_value"] / 100 if coupon["discount_type"] == "percentage" else coupon["discount_value"]
    return {"valid": True, "code": coupon["code"], "discount_type": coupon["discount_type"], "discount_value": coupon["discount_value"], "discount": min(discount, payload.subtotal)}


@admin_router.get("/customers")
def list_customers(db: Database = Depends(get_db), _=Depends(get_current_admin)):
    customers = []
    for user in db.users.find({"role": {"$nin": ["admin", "super_admin"]}}).sort("created_at", -1):
        email = user.get("email", "")
        orders = list(db.orders.find({"$or": [{"customer_email": email}, {"shipping_details.email": email}]}))
        spent = sum(float(o.get("total", o.get("total_amount", 0)) or 0) for o in orders if o.get("status") != "cancelled")
        customers.append({"id": str(user["_id"]), "name": user.get("full_name", "Customer"), "email": email, "phone": user.get("phone"), "city": user.get("city", ""), "created_at": user.get("created_at").isoformat() if isinstance(user.get("created_at"), datetime) else user.get("created_at", ""), "orders_count": len(orders), "total_spent": spent, "tier": "vip" if spent >= 50000 else "regular", "is_active": user.get("is_active", True)})
    return customers


@admin_router.get("/coupons")
def list_coupons(db: Database = Depends(get_db), _=Depends(get_current_admin)):
    return [serialize(x) for x in db.coupons.find().sort("created_at", -1)]


@admin_router.post("/coupons", status_code=201)
def create_coupon(payload: CouponPayload, db: Database = Depends(get_db), _=Depends(get_current_admin)):
    doc = payload.model_dump(); doc["code"] = doc["code"].strip().upper(); doc.update(usage_count=0, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    try: doc["_id"] = db.coupons.insert_one(doc).inserted_id
    except DuplicateKeyError: raise HTTPException(400, "Coupon code already exists.")
    return serialize(doc)


@admin_router.put("/coupons/{record_id}")
def update_coupon(record_id: str, payload: CouponPayload, db: Database = Depends(get_db), _=Depends(get_current_admin)):
    values = payload.model_dump(); values["code"] = values["code"].strip().upper(); values["updated_at"] = datetime.now(timezone.utc)
    result = db.coupons.find_one_and_update({"_id": object_id(record_id)}, {"$set": values}, return_document=True)
    if not result: raise HTTPException(404, "Coupon not found.")
    return serialize(result)


@admin_router.post("/coupons/{record_id}/toggle")
def toggle_coupon(record_id: str, db: Database = Depends(get_db), _=Depends(get_current_admin)):
    current = db.coupons.find_one({"_id": object_id(record_id)})
    if not current: raise HTTPException(404, "Coupon not found.")
    db.coupons.update_one({"_id": current["_id"]}, {"$set": {"is_active": not current.get("is_active", False), "updated_at": datetime.now(timezone.utc)}})
    return {"success": True}


@admin_router.delete("/coupons/{record_id}")
def delete_coupon(record_id: str, db: Database = Depends(get_db), _=Depends(get_current_admin)):
    if not db.coupons.delete_one({"_id": object_id(record_id)}).deleted_count: raise HTTPException(404, "Coupon not found.")
    return {"success": True}


@admin_router.get("/reviews")
def list_reviews(db: Database = Depends(get_db), _=Depends(get_current_admin)):
    return [serialize(x) for x in db.reviews.find().sort("created_at", -1)]


@admin_router.put("/reviews/{record_id}/status")
def moderate_review(record_id: str, payload: ReviewStatusUpdate, db: Database = Depends(get_db), _=Depends(get_current_admin)):
    if not db.reviews.update_one({"_id": object_id(record_id)}, {"$set": {"status": payload.status, "updated_at": datetime.now(timezone.utc)}}).matched_count: raise HTTPException(404, "Review not found.")
    return {"success": True}


@admin_router.delete("/reviews/{record_id}")
def delete_review(record_id: str, db: Database = Depends(get_db), _=Depends(get_current_admin)):
    if not db.reviews.delete_one({"_id": object_id(record_id)}).deleted_count: raise HTTPException(404, "Review not found.")
    return {"success": True}


@admin_router.get("/enquiries")
def list_enquiries(db: Database = Depends(get_db), _=Depends(get_current_admin)):
    return [serialize(x) for x in db.enquiries.find().sort("created_at", -1)]


@admin_router.post("/enquiries/{record_id}/reply")
def reply_enquiry(record_id: str, payload: ReplyPayload, background_tasks: BackgroundTasks, db: Database = Depends(get_db), _=Depends(get_current_admin)):
    if not email_is_configured():
        raise HTTPException(503, "Email service is not configured. Add SMTP settings before sending replies.")
    enquiry = db.enquiries.find_one({"_id": object_id(record_id)})
    if not enquiry: raise HTTPException(404, "Enquiry not found.")
    db.enquiries.update_one({"_id": enquiry["_id"]}, {"$set": {"status": "replied", "reply_message": payload.message, "replied_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}})
    background_tasks.add_task(send_enquiry_reply, enquiry, payload.message)
    return {"success": True, "message": "Reply email queued successfully."}


@admin_router.delete("/enquiries/{record_id}")
def delete_enquiry(record_id: str, db: Database = Depends(get_db), _=Depends(get_current_admin)):
    if not db.enquiries.delete_one({"_id": object_id(record_id)}).deleted_count: raise HTTPException(404, "Enquiry not found.")
    return {"success": True}
