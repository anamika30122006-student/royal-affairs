from typing import List, Optional
from pydantic import BaseModel, Field

class CollectionBase(BaseModel):
    name: str = Field(..., example="New Arrivals")
    slug: Optional[str] = Field(None, example="new-arrivals")
    description: Optional[str] = Field(None, example="Our latest seasonal designer suits edit")
    image: Optional[str] = Field(None, example="./assets/images/hero_slide_1.png")
    is_active: bool = Field(True, example=True)
    display_order: int = Field(0, example=1)
    collection_type: str = Field("custom", example="new_arrivals")
    product_ids: List[str] = Field(default_factory=list, example=["6a5f63ea19ee1cc548ee6d94"])

class CollectionCreate(CollectionBase):
    pass

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    collection_type: Optional[str] = None
    product_ids: Optional[List[str]] = None

class CollectionResponse(CollectionBase):
    id: str
    product_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
