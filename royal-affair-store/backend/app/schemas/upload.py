"""Pydantic schemas for image upload API responses."""
from pydantic import BaseModel, HttpUrl


class ImageUploadResponse(BaseModel):
    """Response returned after a successful product image upload."""
    success: bool = True
    filename: str
    url: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "filename": "a3f1c9d2e4b5678901234567890abcde.jpg",
                "url": "http://127.0.0.1:8000/uploads/products/a3f1c9d2e4b5678901234567890abcde.jpg",
            }
        }
    }


class ImageDeleteResponse(BaseModel):
    """Response returned after deleting a product image."""
    success: bool
    message: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "message": "Image 'a3f1c9d2e4b5678901234567890abcde.jpg' deleted successfully.",
            }
        }
    }
