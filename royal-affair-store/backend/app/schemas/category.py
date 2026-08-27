from pydantic import BaseModel, Field
from typing import Optional

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, example="Anarkali Suits")
    slug: Optional[str] = Field(None, example="anarkali-suits")
    description: Optional[str] = Field(None, example="Heavily embroidered flared velvet and silk Anarkalis")
    image: Optional[str] = Field(None, example="./assets/images/anarkali_maroon.jpg")
    display_order: int = Field(0, ge=0, example=1)
    is_active: bool = Field(True, example=True)
    show_on_home: bool = Field(False, example=True)
    home_display_order: int = Field(0, ge=0, le=4, example=1)

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    show_on_home: Optional[bool] = None
    home_display_order: Optional[int] = Field(None, ge=0, le=4)

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    display_order: int = 0
    product_count: int = 0
    is_active: bool = True
    show_on_home: bool = False
    home_display_order: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
