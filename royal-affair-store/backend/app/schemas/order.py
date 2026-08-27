from typing import List, Optional
from pydantic import BaseModel, Field

class OrderItemSchema(BaseModel):
    product_id: Optional[str] = Field(None, example="60d5ecb8b5c9c82c3c8b4567")
    slug: Optional[str] = Field(None, example="aafreen-organza-anarkali-suit")
    name: str = Field(..., example="Aafreen Organza Anarkali Suit")
    sku: Optional[str] = Field(None, example="RA-ANARKALI-01")
    price: float = Field(..., ge=0, example=12999.0)
    quantity: int = Field(1, ge=1, example=1)
    qty: Optional[int] = Field(None, example=1)
    size: str = Field("M", example="M")
    color: str = Field("Maroon", example="Deep Maroon")
    image: Optional[str] = Field(None, example="./assets/images/anarkali_maroon.jpg")

class OrderCreateSchema(BaseModel):
    order_id: Optional[str] = Field(None, example="RA-847291")
    customer_name: str = Field(..., example="Priya Sharma")
    customer_email: str = Field(..., example="priya@example.com")
    customer_phone: str = Field(..., example="9876543210")
    shipping_address: str = Field(..., example="123 MG Road, Connaught Place, New Delhi - 110001")
    delivery_method: Optional[str] = Field("standard", example="standard")
    payment_method: str = Field("UPI", example="UPI")
    payment_status: Optional[str] = Field("Paid", example="Paid")
    items: List[OrderItemSchema] = Field(..., min_items=1)
    subtotal: float = Field(..., ge=0, example=12999.0)
    discount: float = Field(0.0, ge=0, example=0.0)
    shipping_fee: float = Field(0.0, ge=0, example=0.0)
    total_amount: float = Field(..., ge=0, example=12999.0)

class OrderStatusUpdateSchema(BaseModel):
    status: str = Field(..., example="shipped")
    notes: Optional[str] = Field(None, example="Dispatched via BlueDart AWB# 98234")

class OrderResponseSchema(BaseModel):
    id: str
    order_number: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    shipping_address: str
    delivery_method: Optional[str] = "standard"
    payment_method: str
    payment_status: str
    status: str
    items: List[dict]
    subtotal: float
    discount: float
    shipping_fee: float
    total_amount: float
    notes: Optional[str] = None
    razorpay_order_id:   Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: str
    updated_at: str

class PaginatedOrderResponseSchema(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    orders: List[OrderResponseSchema]
