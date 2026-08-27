"""
File upload validation and storage utilities for Royal Affair product images.

NOTE FOR PRODUCTION:
    Local filesystem storage is used here for development only.
    In production, replace with a persistent object storage service:
      - Cloudinary:  cloudinary.uploader.upload(file)
      - Amazon S3:   boto3 client.upload_fileobj(file, bucket, key)
      - Google GCS:  storage.Client().bucket(...).blob(...).upload_from_file(file)
    Remove or do not mount the local 'uploads/' directory in production.
"""
import uuid
import os
import logging
from pathlib import Path
from fastapi import UploadFile, HTTPException, status

logger = logging.getLogger("royal_affair.file_upload")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
ALLOWED_MIME_TYPES: set[str] = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB

# Base directory is  backend/uploads/products/
UPLOAD_BASE_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "products"
REVIEW_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "reviews"


def ensure_upload_dir() -> None:
    """Create upload directory if it does not already exist."""
    try:
        UPLOAD_BASE_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


def _validate_extension(filename: str) -> str:
    """Return lower-case extension; raise 400 if not allowed."""
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{suffix}' is not allowed. "
                   f"Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return suffix


def _validate_mime(content_type: str) -> None:
    """Raise 400 if MIME type is not an accepted image format."""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type '{content_type}' is not allowed. "
                   f"Accepted: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )


def _safe_filename(original_filename: str) -> str:
    """
    Generate a UUID-based filename that:
      - Preserves the validated extension
      - Contains no path separators (prevents path traversal)
      - Is guaranteed not to collide with existing files
    """
    suffix = Path(original_filename).suffix.lower()
    return f"{uuid.uuid4().hex}{suffix}"


async def save_product_image(file: UploadFile) -> tuple[str, str]:
    """
    Validate and persist an uploaded product image to local storage.

    Steps:
        1. Validate MIME type from Content-Type header.
        2. Validate file extension from original filename.
        3. Read file bytes and enforce 5 MB size limit.
        4. Write to backend/uploads/products/<uuid>.<ext>.

    Returns:
        (safe_filename, absolute_file_path)

    Raises:
        HTTPException 400 on validation failures.
    """
    # 1. MIME validation
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    _validate_mime(content_type)

    # 2. Extension validation
    original_name = file.filename or "upload.bin"
    _validate_extension(original_name)

    # 3. Read bytes and enforce size limit
    data = await file.read()
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size {len(data) / (1024 * 1024):.2f} MB exceeds the "
                   f"maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    # 4. Generate safe filename and persist
    ensure_upload_dir()
    safe_name = _safe_filename(original_name)
    dest_path = UPLOAD_BASE_DIR / safe_name

    # Extra path-traversal guard (should never trigger after UUID generation)
    if not dest_path.resolve().is_relative_to(UPLOAD_BASE_DIR.resolve()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path traversal detected. Upload rejected.",
        )

    dest_path.write_bytes(data)
    logger.info("Saved product image: %s (%d bytes)", safe_name, len(data))
    return safe_name, str(dest_path)


async def save_review_image(file: UploadFile) -> tuple[str, str]:
    """Validate and save a customer review photo (JPEG, PNG or WebP, max 5 MB)."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    _validate_mime(content_type)
    original_name = file.filename or "upload.bin"
    _validate_extension(original_name)
    data = await file.read()
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Review photo must be 5 MB or smaller.")
    REVIEW_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = _safe_filename(original_name)
    destination = REVIEW_UPLOAD_DIR / safe_name
    destination.write_bytes(data)
    return safe_name, str(destination)


def delete_product_image(filename: str) -> bool:
    """
    Delete a previously uploaded product image from local storage.

    Args:
        filename: bare filename (no path components) as returned by the upload API.

    Returns:
        True if the file was deleted, False if it did not exist.

    Raises:
        HTTPException 400 if the filename contains path traversal characters.
    """
    # Reject any filename that contains path separators
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename contains illegal path components.",
        )

    target = UPLOAD_BASE_DIR / filename

    # Guard: resolved path must remain inside the upload directory
    try:
        target.resolve().relative_to(UPLOAD_BASE_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path traversal detected. Delete rejected.",
        )

    if target.exists() and target.is_file():
        target.unlink()
        logger.info("Deleted product image: %s", filename)
        return True

    return False
