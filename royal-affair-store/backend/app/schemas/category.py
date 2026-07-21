from pydantic import BaseModel, Field
from typing import Optional

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, example="Anarkali Suits")
    slug: Optional[str] = Field(None, example="anarkali-suits")
    description: Optional[str] = Field(None, example="Heavily embroidered flared velvet and silk Anarkalis")
    image_url: Optional[str] = Field(None, example="./assets/images/anarkali_maroon.jpg")
    is_active: bool = Field(True, example=True)

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    product_count: Optional[int] = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
