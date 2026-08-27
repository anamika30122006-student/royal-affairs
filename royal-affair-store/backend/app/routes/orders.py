from typing import Optional, List
from fastapi import APIRouter, Depends, status, Query, HTTPException
from pymongo.database import Database
from app.dependencies import get_db, get_current_admin
from app.schemas.order import (
    OrderCreateSchema,
    OrderStatusUpdateSchema,
    OrderResponseSchema,
    PaginatedOrderResponseSchema
)
from app.services.order_service import OrderService

public_router = APIRouter(prefix="/orders", tags=["Orders"])
admin_router = APIRouter(prefix="/admin/orders", tags=["Admin Orders"])

# Public Create Order
@public_router.post(
    "",
    response_model=OrderResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create customer order",
    description="Places a new customer order and automatically reduces product stock in MongoDB."
)
async def create_new_order(
    order_data: OrderCreateSchema,
    db: Database = Depends(get_db)
):
    service = OrderService(db)
    return service.create(order_data)


# Public: List orders for a customer by email
@public_router.get(
    "",
    response_model=PaginatedOrderResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="List customer orders",
    description="Retrieves orders for a specific customer using the `email` query parameter."
)
async def list_customer_orders(
    email: Optional[str] = Query(None, description="Customer email to filter orders"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: Database = Depends(get_db)
):
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing required 'email' query parameter.")
    service = OrderService(db)
    return service.list_orders_by_email(email=email, page=page, limit=limit)

# Public / Admin Get Order by ID or Number
@public_router.get(
    "/{identifier}",
    response_model=OrderResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Get single order details",
    description="Retrieves order summary using order_number (e.g. RA-847291) or ObjectId."
)
async def get_order(
    identifier: str,
    db: Database = Depends(get_db)
):
    service = OrderService(db)
    return service.get_order_by_identifier(identifier)

# Admin List Orders
@admin_router.get(
    "",
    response_model=List[OrderResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="List all orders (Admin Only)",
    description="Retrieves a list of all customer orders for Admin Dashboard management."
)
async def list_admin_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = OrderService(db)
    res = service.list_orders(page=page, limit=limit)
    return res.orders

# Admin Update Order Status
@admin_router.put(
    "/{identifier}/status",
    response_model=OrderResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Update order fulfillment status (Admin Only)",
    description="Updates order status (e.g. processing, shipped, delivered, cancelled) and notes."
)
async def update_admin_order_status(
    identifier: str,
    status_data: OrderStatusUpdateSchema,
    db: Database = Depends(get_db),
    admin_user: dict = Depends(get_current_admin)
):
    service = OrderService(db)
    return service.update_status(identifier, status_data)
