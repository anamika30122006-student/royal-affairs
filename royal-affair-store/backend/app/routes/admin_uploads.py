"""
Admin-only image upload and delete endpoints for Royal Affair product images.

Security model:
  - Both endpoints require a valid JWT Bearer token with role 'admin' or 'super_admin'.
  - Files are validated by MIME type AND file extension before saving.
  - Filenames are replaced with a UUID to prevent path-traversal and unsafe names.
  - Maximum file size: 5 MB.
  - Allowed types: image/jpeg, image/png, image/webp.

NOTE FOR PRODUCTION:
    Replace local filesystem storage with Cloudinary / Amazon S3 / Google GCS.
    See app/utils/file_upload.py for integration guidance.
"""
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status

from app.dependencies import get_current_admin
from app.schemas.upload import ImageUploadResponse, ImageDeleteResponse
from app.utils.file_upload import save_product_image, delete_product_image
from app.config import settings

logger = logging.getLogger("royal_affair.admin_uploads")

router = APIRouter(
    prefix="/admin/uploads",
    tags=["Admin – Image Uploads"],
)

# ---------------------------------------------------------------------------
# POST  /api/v1/admin/uploads/product-image
# ---------------------------------------------------------------------------
@router.post(
    "/product-image",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a product image (Admin Only)",
    description=(
        "Upload a single product image as `multipart/form-data`. "
        "Returns the public URL to store in `thumbnail` or `images[]` fields of a product. "
        "**Allowed types:** `image/jpeg`, `image/png`, `image/webp`. "
        "**Max size:** 5 MB. "
        "Requires `admin` or `super_admin` role."
    ),
)
async def upload_product_image(
    file: UploadFile = File(
        ...,
        description="Product image file (JPEG / PNG / WebP, max 5 MB)",
    ),
    admin_user: dict = Depends(get_current_admin),
) -> ImageUploadResponse:
    """
    Upload and store a product image.

    Workflow for admin:
    1. Call this endpoint with the image file.
    2. Copy the returned `url` field.
    3. Pass that URL as `thumbnail` or inside `images[]` when creating/updating a product via
       `POST /api/v1/admin/products` or `PUT /api/v1/admin/products/{id}`.
    """
    safe_name, _ = await save_product_image(file)

    public_url = (
        f"http://{settings.HOST}:{settings.PORT}/uploads/products/{safe_name}"
    )

    logger.info(
        "Admin '%s' uploaded product image '%s'",
        admin_user.get("email", "unknown"),
        safe_name,
    )

    return ImageUploadResponse(
        success=True,
        filename=safe_name,
        url=public_url,
    )


# ---------------------------------------------------------------------------
# DELETE  /api/v1/admin/uploads/product-image/{filename}
# ---------------------------------------------------------------------------
@router.delete(
    "/product-image/{filename}",
    response_model=ImageDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a product image (Admin Only)",
    description=(
        "Permanently removes an uploaded image from local storage. "
        "Pass the bare `filename` (e.g. `abc123.jpg`) returned by the upload endpoint — "
        "**not** a full path or URL. "
        "Requires `admin` or `super_admin` role."
    ),
)
async def delete_uploaded_image(
    filename: str,
    admin_user: dict = Depends(get_current_admin),
) -> ImageDeleteResponse:
    """
    Delete a previously uploaded product image by its bare filename.

    Note:
        This does NOT update product documents in MongoDB.
        If the image URL is already stored on a product, remove it manually via
        `PUT /api/v1/admin/products/{id}` after calling this endpoint.
    """
    deleted = delete_product_image(filename)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{filename}' not found in product uploads.",
        )

    logger.info(
        "Admin '%s' deleted product image '%s'",
        admin_user.get("email", "unknown"),
        filename,
    )

    return ImageDeleteResponse(
        success=True,
        message=f"Image '{filename}' deleted successfully.",
    )
