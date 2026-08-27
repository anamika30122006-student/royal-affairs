"""
Test suite – Phase 3: Secure Product Image Upload
==================================================
Covers:
  1. Valid JPEG upload (admin)
  2. Valid PNG upload (admin)
  3. Invalid file type (text/plain)
  4. Oversized image (> 5 MB)
  5. Unauthenticated access (no token)
  6. Non-admin user (regular user role)
  7. Delete uploaded image (admin)
  8. Path traversal attempt on DELETE

Run with:
    cd royal-affair-store/backend
    python -m pytest tests/test_uploads.py -v
"""
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
import app.database as database

# ---------------------------------------------------------------------------
# Module-level client and shared state
# ---------------------------------------------------------------------------
client = TestClient(app)

_admin_token: str = ""
_user_token: str = ""
_uploaded_filename: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_image_bytes(size: int = 100) -> bytes:
    """Return minimal valid JPEG bytes (just enough to pass MIME checks)."""
    # Minimal JPEG: SOI + EOI markers
    return b"\xff\xd8\xff\xe0" + b"\x00" * (size - 4) + b"\xff\xd9"


def _make_png_bytes() -> bytes:
    """Return minimal valid PNG signature bytes."""
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 92


def _make_webp_bytes() -> bytes:
    """Return minimal valid WebP header bytes."""
    return b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 80



# ---------------------------------------------------------------------------
# Session setup / teardown
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module", autouse=True)
def setup_db_and_tokens():
    """Connect DB, register admin and regular user, capture tokens, then cleanup."""
    global _admin_token, _user_token

    database.connect_to_mongo()

    # Ensure phone index is sparse (drop non-sparse version if it exists)
    if database.db is not None:
        try:
            idx_info = database.db.users.index_information()
            if "uniq_users_phone" in idx_info and not idx_info["uniq_users_phone"].get("sparse"):
                database.db.users.drop_index("uniq_users_phone")
                from pymongo import ASCENDING
                database.db.users.create_index(
                    [("phone", ASCENDING)], unique=True, sparse=True, name="uniq_users_phone"
                )
        except Exception:
            pass

    # Clean up stale test accounts
    if database.db is not None:
        database.db.users.delete_many(
            {"email": {"$in": ["upload_admin@test.com", "upload_user@test.com"]}}
        )

    # Register admin (no phone field → sparse index won't index the missing field)
    r = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Upload Admin",
            "email": "upload_admin@test.com",
            "password": "Admin123!@#",
            "role": "admin",
            "phone": "+91 9800000001",
        },
    )
    assert r.status_code == 201, f"Admin register failed: {r.text}"
    _admin_token = r.json()["access_token"]

    # Register normal user (unique phone)
    r = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Upload User",
            "email": "upload_user@test.com",
            "password": "User123!@#",
            "role": "user",
            "phone": "+91 9800000002",
        },
    )
    assert r.status_code == 201, f"User register failed: {r.text}"
    _user_token = r.json()["access_token"]

    yield

    # Teardown – remove test accounts
    if database.db is not None:
        database.db.users.delete_many(
            {"email": {"$in": ["upload_admin@test.com", "upload_user@test.com"]}}
        )
    database.close_mongo_connection()


# ---------------------------------------------------------------------------
# Test 1 – Valid JPEG upload
# ---------------------------------------------------------------------------
def test_upload_valid_jpeg():
    """Admin can upload a valid JPEG file and receive a public URL."""
    global _uploaded_filename

    img_bytes = _make_image_bytes(1024)
    response = client.post(
        "/api/v1/admin/uploads/product-image",
        files={"file": ("test_suit.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        headers=_auth(_admin_token),
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["success"] is True
    assert data["filename"].endswith(".jpg")
    assert "/uploads/products/" in data["url"]
    assert data["filename"] in data["url"]

    # Store filename for delete test
    _uploaded_filename = data["filename"]


# ---------------------------------------------------------------------------
# Test 2 – Valid PNG upload
# ---------------------------------------------------------------------------
def test_upload_valid_png():
    """Admin can upload a valid PNG file and receive a public URL."""
    png_bytes = _make_png_bytes()
    response = client.post(
        "/api/v1/admin/uploads/product-image",
        files={"file": ("product_banner.png", io.BytesIO(png_bytes), "image/png")},
        headers=_auth(_admin_token),
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["success"] is True
    assert data["filename"].endswith(".png")


def test_upload_valid_webp():
    """Admin can upload a valid WebP file and receive a public URL."""
    webp_bytes = _make_webp_bytes()
    response = client.post(
        "/api/v1/admin/uploads/product-image",
        files={"file": ("product_hero.webp", io.BytesIO(webp_bytes), "image/webp")},
        headers=_auth(_admin_token),
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["success"] is True
    assert data["filename"].endswith(".webp")



# ---------------------------------------------------------------------------
# Test 3 – Invalid file type (text/plain)
# ---------------------------------------------------------------------------
def test_upload_invalid_file_type():
    """Uploading a text file must return HTTP 400."""
    response = client.post(
        "/api/v1/admin/uploads/product-image",
        files={"file": ("malicious.txt", io.BytesIO(b"rm -rf /"), "text/plain")},
        headers=_auth(_admin_token),
    )
    assert response.status_code == 400, response.text
    assert "not allowed" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 4 – Oversized image (> 5 MB)
# ---------------------------------------------------------------------------
def test_upload_oversized_image():
    """Uploading a file larger than 5 MB must return HTTP 400."""
    big_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * (6 * 1024 * 1024) + b"\xff\xd9"
    response = client.post(
        "/api/v1/admin/uploads/product-image",
        files={"file": ("big.jpg", io.BytesIO(big_bytes), "image/jpeg")},
        headers=_auth(_admin_token),
    )
    assert response.status_code == 400, response.text
    assert "exceeds" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 5 – Unauthenticated access (no token)
# ---------------------------------------------------------------------------
def test_upload_unauthenticated():
    """Request without Authorization header must return HTTP 403 or 401."""
    img_bytes = _make_image_bytes(512)
    response = client.post(
        "/api/v1/admin/uploads/product-image",
        files={"file": ("suit.jpg", io.BytesIO(img_bytes), "image/jpeg")},
    )
    assert response.status_code in (401, 403), response.text


# ---------------------------------------------------------------------------
# Test 6 – Non-admin user
# ---------------------------------------------------------------------------
def test_upload_non_admin_user():
    """A regular user (role='user') must receive HTTP 403 Forbidden."""
    img_bytes = _make_image_bytes(512)
    response = client.post(
        "/api/v1/admin/uploads/product-image",
        files={"file": ("suit.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        headers=_auth(_user_token),
    )
    assert response.status_code == 403, response.text


# ---------------------------------------------------------------------------
# Test 7 – Delete uploaded image
# ---------------------------------------------------------------------------
def test_delete_uploaded_image():
    """Admin can delete a previously uploaded image."""
    assert _uploaded_filename, "No filename captured from upload test"

    response = client.delete(
        f"/api/v1/admin/uploads/product-image/{_uploaded_filename}",
        headers=_auth(_admin_token),
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    assert _uploaded_filename in data["message"]


# ---------------------------------------------------------------------------
# Test 8 – Delete non-existent image returns 404
# ---------------------------------------------------------------------------
def test_delete_nonexistent_image():
    """Attempting to delete an image that does not exist returns 404."""
    response = client.delete(
        "/api/v1/admin/uploads/product-image/does_not_exist.jpg",
        headers=_auth(_admin_token),
    )
    assert response.status_code == 404, response.text


# ---------------------------------------------------------------------------
# Test 9 – Path traversal attempt on DELETE
# ---------------------------------------------------------------------------
def test_delete_path_traversal():
    """
    Attempting path traversal via filename must return 400.
    FastAPI URL routing will percent-encode or reject slashes in path params,
    so we use dot-dot notation that could still slip through some parsers.
    """
    # FastAPI decodes %2F but its router won't match '/' as part of a path param.
    # We test the util layer directly with the double-dot pattern.
    from app.utils.file_upload import delete_product_image
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        delete_product_image("../../etc/passwd")

    assert exc_info.value.status_code == 400
