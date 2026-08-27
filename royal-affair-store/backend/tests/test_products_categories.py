import pytest
from fastapi.testclient import TestClient
from app.main import app
import app.database as database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    database.connect_to_mongo()
    yield
    database.close_mongo_connection()

def test_phase2_full_suite():
    # 1. Setup Admin Token and Normal User Token
    if database.db is not None:
        database.db.users.delete_many({'email': {'$in': ['phase2admin@royalaffair.in', 'phase2user@royalaffair.in']}})
        database.db.categories.delete_many({'slug': 'test-bridal-anarkalis'})
        database.db.products.delete_many({'sku': {'$in': ['RA-PHASE2-01', 'RA-PHASE2-DUP']}})

    # Register Admin
    reg_admin = client.post('/api/v1/auth/register', json={
        'full_name': 'Phase2 Admin',
        'email': 'phase2admin@royalaffair.in',
        'phone': '+91 9111111111',
        'password': 'AdminPassword123!',
        'role': 'admin'
    })
    assert reg_admin.status_code == 201, f"Admin reg failed: {reg_admin.text}"
    admin_token = reg_admin.json()['access_token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}

    # Register Normal User
    reg_user = client.post('/api/v1/auth/register', json={
        'full_name': 'Phase2 User',
        'email': 'phase2user@royalaffair.in',
        'phone': '+91 9222222222',
        'password': 'UserPassword123!',
        'role': 'user'
    })
    assert reg_user.status_code == 201, f"User reg failed: {reg_user.text}"
    user_token = reg_user.json()['access_token']
    user_headers = {'Authorization': f'Bearer {user_token}'}

    # TEST 1: Category Creation (Admin)
    cat_payload = {
        'name': 'Test Bridal Anarkalis',
        'slug': 'test-bridal-anarkalis',
        'description': 'Luxury handcrafted bridal gowns and Anarkalis',
        'image': './assets/images/anarkali_maroon.jpg',
        'is_active': True
    }
    res_cat = client.post('/api/v1/admin/categories', json=cat_payload, headers=admin_headers)
    assert res_cat.status_code == 201, f"Category creation failed: {res_cat.text}"
    cat_data = res_cat.json()
    cat_id = cat_data['id']
    assert cat_data['slug'] == 'test-bridal-anarkalis'

    # TEST 2: Product Creation (Admin)
    prod_payload = {
        'name': 'Royal Phase2 Zardozi Velvet Suit',
        'slug': 'royal-phase2-zardozi-velvet-suit',
        'sku': 'RA-PHASE2-01',
        'short_description': 'Luxury velvet Anarkali suit.',
        'description': 'Handcrafted velvet suit with zardozi embroidery.',
        'category_id': cat_id,
        'subcategory': 'Velvet Anarkali',
        'price': 15999.0,
        'original_price': 19999.0,
        'discount_percentage': 20.0,
        'stock': 10,
        'sizes': ['M', 'L', 'XL'],
        'colors': ['Maroon', 'Gold'],
        'fabric': 'Pure Silk Velvet',
        'occasion': 'Bridal Wear',
        'brand': 'Royal Affair',
        'thumbnail': './assets/images/anarkali_maroon.jpg',
        'images': ['./assets/images/anarkali_maroon.jpg'],
        'featured': True,
        'bestseller': True,
        'new_arrival': True,
        'status': 'published',
        'is_active': True
    }
    res_prod = client.post('/api/v1/admin/products', json=prod_payload, headers=admin_headers)
    assert res_prod.status_code == 201, f"Product creation failed: {res_prod.text}"
    prod_data = res_prod.json()
    prod_id = prod_data['id']
    assert prod_data['sku'] == 'RA-PHASE2-01'

    # TEST 3: Duplicate SKU (Must return 409 Conflict)
    dup_payload = prod_payload.copy()
    dup_payload['slug'] = 'different-slug-unique'
    res_dup_sku = client.post('/api/v1/admin/products', json=dup_payload, headers=admin_headers)
    assert res_dup_sku.status_code == 409, f"Expected 409 Conflict for duplicate SKU, got {res_dup_sku.status_code}"

    # TEST 4: Public Product Listing
    res_pub_list = client.get('/api/v1/products')
    assert res_pub_list.status_code == 200
    list_json = res_pub_list.json()
    assert list_json['total'] >= 1
    assert any(p['sku'] == 'RA-PHASE2-01' for p in list_json['products'])

    # TEST 5: Product Filters (search, min_price, fabric, occasion)
    res_filtered = client.get('/api/v1/products?search=Velvet&min_price=10000&fabric=Velvet&occasion=Bridal')
    assert res_filtered.status_code == 200
    filtered_json = res_filtered.json()
    assert filtered_json['total'] >= 1

    # TEST 6: Unauthorized Admin Access (Normal user calling admin endpoint must return 403 Forbidden)
    res_unauth = client.post('/api/v1/admin/products', json=prod_payload, headers=user_headers)
    assert res_unauth.status_code == 403, f"Expected 403 Forbidden for normal user on admin endpoint, got {res_unauth.status_code}"

    # TEST 7: Soft Delete Behavior
    res_delete = client.delete(f'/api/v1/admin/products/{prod_id}', headers=admin_headers)
    assert res_delete.status_code == 200
    assert 'soft-deleted' in res_delete.json()['message']

    # Verify soft-deleted product is no longer returned in public endpoints (Expect 404 on GET)
    res_pub_get = client.get(f'/api/v1/products/{prod_id}')
    assert res_pub_get.status_code == 404, f"Expected 404 for soft-deleted product in public API, got {res_pub_get.status_code}"

    print("All Phase 2 automated test assertions completed successfully.")
