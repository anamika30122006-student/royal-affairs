from pydantic import BaseModel, Field
from typing import Optional, List

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, example="Aafreen Organza Anarkali Suit")
    slug: Optional[str] = Field(None, example="aafreen-organza-anarkali-suit")
    sku: str = Field(..., example="RA-ANARKALI-01")
    brand: Optional[str] = Field("Royal Affair", example="Royal Affair")
    category: str = Field(..., example="Anarkali Suits")
    price: float = Field(..., gt=0, example=12999.0)
    original_price: Optional[float] = Field(None, example=16999.0)
    discount_percent: Optional[int] = Field(None, example=23)
    fabric: Optional[str] = Field("Pure Silk / Georgette", example="Pure Silk Velvet & Georgette")
    colors: List[str] = Field(default_factory=lambda: ["Plum", "Deep Maroon", "Gold"], example=["Plum", "Deep Maroon", "Gold"])
    sizes: List[str] = Field(default_factory=lambda: ["S", "M", "L", "XL", "XXL"], example=["S", "M", "L", "XL", "XXL"])
    stock: int = Field(10, ge=0, example=15)
    thumbnail_image: Optional[str] = Field(None, example="./assets/images/anarkali_maroon.jpg")
    images: List[str] = Field(default_factory=list, example=["./assets/images/anarkali_maroon.jpg", "./assets/images/anarkali_maroon_back.jpg"])
    description: Optional[str] = Field(None, example="Hand-embroidered zardozi work with matching dupattas and tailored pants.")
    details: Optional[List[str]] = Field(default_factory=list, example=["Dry Clean Only", "Includes Kameez, Dupatta & Pants"])
    status: str = Field("published", example="published")
    is_featured: bool = Field(False, example=True)
    is_new_arrival: bool = Field(False, example=True)
    is_best_seller: bool = Field(False, example=True)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percent: Optional[int] = None
    fabric: Optional[str] = None
    colors: Optional[List[str]] = None
    sizes: Optional[List[str]] = None
    stock: Optional[int] = None
    thumbnail_image: Optional[str] = None
    images: Optional[List[str]] = None
    description: Optional[str] = None
    details: Optional[List[str]] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    is_new_arrival: Optional[bool] = None
    is_best_seller: Optional[bool] = None
    is_deleted: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    slug: str
    sku: str
    brand: str
    category: str
    price: float
    original_price: Optional[float] = None
    discount_percent: Optional[int] = 0
    fabric: Optional[str] = None
    colors: List[str] = []
    sizes: List[str] = []
    stock: int = 0
    thumbnail_image: Optional[str] = None
    images: List[str] = []
    description: Optional[str] = None
    details: List[str] = []
    status: str = "published"
    is_featured: bool = False
    is_new_arrival: bool = False
    is_best_seller: bool = False
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
