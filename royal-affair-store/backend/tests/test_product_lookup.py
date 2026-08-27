"""
Test Suite – Product Lookup & Hidden Product States
===================================================
Covers:
  1. SKU Lookup (Admin) for existing SKU 'RBS-001' (returns ID '6a605ac31169f91b8655e367')
  2. Case-insensitive SKU lookup
  3. Non-existent SKU lookup (returns 404)
  4. Public search across Name, SKU, and Slug
  5. Admin listing ALL products (including draft, inactive, and soft-deleted)
  6. Public listing hiding draft, inactive, and soft-deleted products
  7. Prevent duplicate creation of SKU 'RBS-001' (returns 409 Conflict)
  8. Non-admin access control on admin lookup endpoints (returns 403)
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
import app.database as database

client = TestClient(app)

_admin_token: str = ""
_user_token: str = ""

def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module", autouse=True)
def setup_db_and_users():
    global _admin_token, _user_token
    database.connect_to_mongo()

    if database.db is not None:
        database.db.users.delete_many(
            {"email": {"$in": ["lookup_admin@test.com", "lookup_user@test.com"]}}
        )

    # Register admin
    r1 = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Lookup Admin",
            "email": "lookup_admin@test.com",
            "password": "AdminPassword123!",
            "role": "admin",
            "phone": "+91 9300000001",
        },
    )
    assert r1.status_code == 201, f"Admin register failed: {r1.text}"
    _admin_token = r1.json()["access_token"]

    # Register user
    r2 = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Lookup User",
            "email": "lookup_user@test.com",
            "password": "UserPassword123!",
            "role": "user",
            "phone": "+91 9300000002",
        },
    )
    assert r2.status_code == 201, f"User register failed: {r2.text}"
    _user_token = r2.json()["access_token"]

    yield

    if database.db is not None:
        database.db.users.delete_many(
            {"email": {"$in": ["lookup_admin@test.com", "lookup_user@test.com"]}}
        )
    database.close_mongo_connection()

def test_admin_get_product_by_sku_rbs001():
    """GET /api/v1/admin/products/by-sku/RBS-001 must return the existing product (ID 6a605ac31169f91b8655e367)."""
    res = client.get("/api/v1/admin/products/by-sku/RBS-001", headers=_auth(_admin_token))
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["sku"] == "RBS-001"
    assert data["id"] == "6a605ac31169f91b8655e367"
    assert data["name"] == "Royal Black Suit"

def test_admin_get_product_by_sku_case_insensitive():
    """GET /api/v1/admin/products/by-sku/rbs-001 (lower-case) must match case-insensitively."""
    res = client.get("/api/v1/admin/products/by-sku/rbs-001", headers=_auth(_admin_token))
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["sku"] == "RBS-001"
    assert data["id"] == "6a605ac31169f91b8655e367"

def test_admin_get_product_by_sku_not_found():
    """GET /api/v1/admin/products/by-sku/NONEXISTENT-999 returns 404."""
    res = client.get("/api/v1/admin/products/by-sku/NONEXISTENT-999", headers=_auth(_admin_token))
    assert res.status_code == 404, res.text

def test_duplicate_sku_creation_rejected():
    """Creating a product with SKU 'RBS-001' must return 409 Conflict."""
    payload = {
        "name": "Duplicate Royal Black Suit",
        "sku": "RBS-001",
        "category_id": "60d5ecb8b5c9c82c3c8b4567",
        "price": 4999.0,
        "stock": 10
    }
    res = client.post("/api/v1/admin/products", json=payload, headers=_auth(_admin_token))
    assert res.status_code == 409, res.text
    assert "already exists" in res.json()["detail"]

def test_public_search_by_name_sku_slug():
    """Search must locate 'Royal Black Suit' by Name, SKU, or Slug."""
    # 1. Search by Name
    res1 = client.get("/api/v1/products?search=Royal Black Suit")
    assert res1.status_code == 200, res1.text
    assert any(p["sku"] == "RBS-001" for p in res1.json()["products"])

    # 2. Search by SKU
    res2 = client.get("/api/v1/products?search=RBS-001")
    assert res2.status_code == 200, res2.text
    assert any(p["sku"] == "RBS-001" for p in res2.json()["products"])

    # 3. Search by Slug
    res3 = client.get("/api/v1/products?search=royal-black-suit")
    assert res3.status_code == 200, res3.text
    assert any(p["sku"] == "RBS-001" for p in res3.json()["products"])

def test_admin_list_all_includes_hidden_products():
    """Admin GET /api/v1/admin/products/all returns draft, inactive, and soft-deleted products."""
    # Create draft product
    draft_res = client.post(
        "/api/v1/admin/products",
        json={
            "name": "Hidden Draft Suit",
            "sku": "RA-HIDDEN-DRAFT-01",
            "category_id": "60d5ecb8b5c9c82c3c8b4567",
            "price": 7999.0,
            "status": "draft"
        },
        headers=_auth(_admin_token)
    )
    assert draft_res.status_code == 201, draft_res.text
    draft_id = draft_res.json()["id"]

    # Public endpoint MUST NOT return the draft product
    pub_res = client.get(f"/api/v1/products/{draft_id}")
    assert pub_res.status_code == 404

    # Admin all endpoint MUST return the draft product
    admin_res = client.get("/api/v1/admin/products/all", headers=_auth(_admin_token))
    assert admin_res.status_code == 200, admin_res.text
    assert any(p["id"] == draft_id for p in admin_res.json()["products"])

    # Cleanup draft product
    if database.db is not None:
        database.db.products.delete_one({"_id": database.db.products.find_one({"sku": "RA-HIDDEN-DRAFT-01"})["_id"]})

def test_non_admin_forbidden_on_admin_endpoints():
    """Regular users calling /admin/products/by-sku/RBS-001 or /admin/products/all receive 403."""
    res1 = client.get("/api/v1/admin/products/by-sku/RBS-001", headers=_auth(_user_token))
    assert res1.status_code == 403

    res2 = client.get("/api/v1/admin/products/all", headers=_auth(_user_token))
    assert res2.status_code == 403
