from pydantic import BaseModel, Field
from typing import Optional, List

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, example="Aafreen Organza Anarkali Suit")
    slug: Optional[str] = Field(None, example="aafreen-organza-anarkali-suit")
    sku: str = Field(..., example="RA-ANARKALI-01")
    short_description: Optional[str] = Field(None, example="Regal maroon velvet Anarkali with zardozi embroidery.")
    description: Optional[str] = Field(None, example="Exquisite regal maroon velvet Anarkali decorated with traditional Zardozi hand-embroidery.")
    category_id: str = Field(..., example="60d5ecb8b5c9c82c3c8b4567")
    collection_ids: Optional[List[str]] = Field(default_factory=list, example=["6a607f1c253a9fdb828dc006"])
    subcategory: Optional[str] = Field(None, example="Velvet Anarkali")
    price: float = Field(..., gt=0, example=12999.0)
    original_price: Optional[float] = Field(None, example=16999.0)
    discount_percentage: Optional[float] = Field(None, example=23.5)
    stock: int = Field(10, ge=0, example=15)
    sizes: List[str] = Field(default_factory=lambda: ["S", "M", "L", "XL"], example=["S", "M", "L", "XL"])
    colors: List[str] = Field(default_factory=lambda: ["Plum", "Deep Maroon", "Gold"], example=["Plum", "Deep Maroon", "Gold"])
    fabric: Optional[str] = Field("Pure Silk Velvet", example="Pure Silk Velvet & Georgette")
    occasion: Optional[str] = Field("Bridal Wear", example="Wedding & Bridal Wear")
    brand: Optional[str] = Field("Royal Affair", example="Royal Affair")
    thumbnail: Optional[str] = Field(None, example="./assets/images/anarkali_maroon.jpg")
    images: List[str] = Field(default_factory=list, example=["./assets/images/anarkali_maroon.jpg", "./assets/images/anarkali_maroon_back.jpg"])
    featured: bool = Field(False, example=True)
    bestseller: bool = Field(False, example=True)
    new_arrival: bool = Field(False, example=True)
    status: str = Field("published", example="published")
    is_active: bool = Field(True, example=True)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    collection_ids: Optional[List[str]] = None
    subcategory: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percentage: Optional[float] = None
    stock: Optional[int] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    fabric: Optional[str] = None
    occasion: Optional[str] = None
    brand: Optional[str] = None
    thumbnail: Optional[str] = None
    images: Optional[List[str]] = None
    featured: Optional[bool] = None
    bestseller: Optional[bool] = None
    new_arrival: Optional[bool] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    is_deleted: Optional[bool] = None

class StockPatchRequest(BaseModel):
    stock: int = Field(..., ge=0, example=25)

class ProductResponse(BaseModel):
    id: str
    name: str
    slug: str
    sku: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: str
    collection_ids: List[str] = []
    subcategory: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    discount_percentage: Optional[float] = 0.0
    stock: int = 0
    sizes: List[str] = []
    colors: List[str] = []
    fabric: Optional[str] = None
    occasion: Optional[str] = None
    brand: str = "Royal Affair"
    thumbnail: Optional[str] = None
    images: List[str] = []
    featured: bool = False
    bestseller: bool = False
    new_arrival: bool = False
    status: str = "published"
    is_active: bool = True
    is_deleted: bool = False
    rating: float = 4.8
    review_count: int = 14
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PaginatedProductResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    products: List[ProductResponse]
