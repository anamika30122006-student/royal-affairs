"""
Royal Affair – Razorpay Payment Routes
=======================================
POST /api/v1/payments/create-razorpay-order
    Creates a Razorpay order and returns order_id + key_id for the frontend popup.

POST /api/v1/payments/verify
    Verifies HMAC signature, then creates the DB order + decrements stock.
    Returns the saved order details including payment_id and razorpay_order_id.
"""

import hmac
import hashlib
import razorpay
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from pymongo.database import Database

from app.config import settings
from app.dependencies import get_db
from app.schemas.order import OrderItemSchema, OrderResponseSchema
from app.services.order_service import OrderService, format_order_response

router = APIRouter(prefix="/payments", tags=["Payments"])


# ──────────────────────────────────────────────
# Helper: build Razorpay client
# ──────────────────────────────────────────────
def _get_razorpay_client() -> razorpay.Client:
    key_id     = settings.RAZORPAY_KEY_ID.strip()
    key_secret = settings.RAZORPAY_KEY_SECRET.strip()
    if not key_id or not key_secret or key_id.startswith("rzp_test_xxx"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.",
        )
    return razorpay.Client(auth=(key_id, key_secret))


# ──────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────
class CreateRazorpayOrderRequest(BaseModel):
    """Minimal data needed to create a Razorpay order (amount in INR)."""
    amount: float = Field(..., gt=0, description="Order amount in INR (e.g. 4899.00)")
    currency: str = Field("INR", description="Currency code")
    receipt: Optional[str] = Field(None, description="Internal receipt reference")
    notes: Optional[dict] = Field(None, description="Optional notes dict")


class CreateRazorpayOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int          # in paise
    currency: str
    key_id: str          # frontend uses this to open the checkout popup


class VerifyPaymentRequest(BaseModel):
    """Sent after the Razorpay popup succeeds."""
    # Razorpay payment details
    razorpay_order_id:   str
    razorpay_payment_id: str
    razorpay_signature:  str

    # Full order details (same payload as /orders POST)
    customer_name:    str
    customer_email:   str
    customer_phone:   str
    shipping_address: str
    delivery_method:  Optional[str] = "standard"
    payment_method:   str = "Razorpay"
    items: List[OrderItemSchema]
    subtotal:     float
    discount:     float = 0.0
    shipping_fee: float = 0.0
    total_amount: float


# ──────────────────────────────────────────────
# Endpoint 1 – Create Razorpay Order
# ──────────────────────────────────────────────
@router.post(
    "/create-razorpay-order",
    response_model=CreateRazorpayOrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Create Razorpay Order",
    description="Creates a Razorpay order on Razorpay's servers. Returns order_id and key_id for the frontend popup.",
)
async def create_razorpay_order(payload: CreateRazorpayOrderRequest):
    client = _get_razorpay_client()

    amount_paise = int(round(payload.amount * 100))  # convert INR → paise

    try:
        rz_order = client.order.create({
            "amount":   amount_paise,
            "currency": payload.currency,
            "receipt":  payload.receipt or f"receipt_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "notes":    payload.notes or {},
        })
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Razorpay API error: {str(exc)}",
        )

    return CreateRazorpayOrderResponse(
        razorpay_order_id=rz_order["id"],
        amount=rz_order["amount"],
        currency=rz_order["currency"],
        key_id=settings.RAZORPAY_KEY_ID,
    )


# ──────────────────────────────────────────────
# Endpoint 2 – Verify & Save Order
# ──────────────────────────────────────────────
@router.post(
    "/verify",
    response_model=OrderResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Verify Razorpay Payment & Save Order",
    description=(
        "Verifies the Razorpay HMAC signature. On success, creates the order in MongoDB, "
        "decrements product stock, and marks the order as Paid."
    ),
)
async def verify_and_save_order(
    payload: VerifyPaymentRequest,
    db: Database = Depends(get_db),
):
    # ── 1. Verify HMAC signature ──────────────────────────────────
    key_secret = settings.RAZORPAY_KEY_SECRET.strip().encode()
    message    = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode()
    expected   = hmac.new(key_secret, message, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment signature verification failed. Order not created.",
        )

    # ── 2. Idempotency check: return existing order if already saved
    existing = db.orders.find_one({
        "$or": [
            {"razorpay_payment_id": payload.razorpay_payment_id},
            {"razorpay_order_id": payload.razorpay_order_id}
        ]
    })
    if existing:
        # Order already recorded — return it (avoid duplicate inserts and stock re-adjustment)
        return format_order_response(existing)

    # ── 3. Build and save order in MongoDB ───────────────────────
    now = datetime.now(timezone.utc)
    import random
    order_num = f"RA-{random.randint(100000, 999999)}"

    items_docs = []
    for item in payload.items:
        qty_val = item.quantity or item.qty or 1
        item_dict = {
            "product_id": str(item.product_id) if item.product_id else None,
            "slug":       item.slug,
            "name":       item.name,
            "sku":        item.sku,
            "price":      float(item.price),
            "quantity":   qty_val,
            "qty":        qty_val,
            "size":       item.size,
            "color":      item.color,
            "image":      item.image,
        }
        items_docs.append(item_dict)

        # Decrement stock
        _decrement_stock(db, item.product_id, item.slug, qty_val)

    order_doc = {
        "order_number":         order_num,
        "order_id":             order_num,
        "customer_name":        payload.customer_name.strip(),
        "customer_email":       payload.customer_email.strip().lower(),
        "customer_phone":       payload.customer_phone.strip(),
        "shipping_address":     payload.shipping_address.strip(),
        "delivery_method":      payload.delivery_method or "standard",
        "payment_method":       "Razorpay",
        "payment_status":       "Paid",             # verified → always Paid
        "razorpay_order_id":    payload.razorpay_order_id,
        "razorpay_payment_id":  payload.razorpay_payment_id,
        "razorpay_signature":   payload.razorpay_signature,
        "status":               "processing",
        "items":                items_docs,
        "subtotal":             float(payload.subtotal),
        "discount":             float(payload.discount),
        "shipping_fee":         float(payload.shipping_fee),
        "total_amount":         float(payload.total_amount),
        "created_at":           now,
        "updated_at":           now,
    }

    res = db.orders.insert_one(order_doc)
    order_doc["_id"] = res.inserted_id

    return format_order_response(order_doc)


# ──────────────────────────────────────────────
# Internal helper – decrement stock
# ──────────────────────────────────────────────
def _decrement_stock(db: Database, product_id: Optional[str], slug: Optional[str], qty: int):
    from bson import ObjectId
    query = None
    if product_id and ObjectId.is_valid(product_id):
        query = {"_id": ObjectId(product_id)}
    elif slug:
        query = {"slug": slug.strip().lower()}
    if not query:
        return
    prod = db.products.find_one(query)
    if prod:
        new_stock = max(0, int(prod.get("stock", 0)) - qty)
        db.products.update_one(
            {"_id": prod["_id"]},
            {"$set": {"stock": new_stock, "updated_at": datetime.now(timezone.utc)}},
        )
