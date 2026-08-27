import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import datetime, timezone
from app.database import connect_to_mongo, close_mongo_connection, get_database

def seed():
    connect_to_mongo()
    db = get_database()

    if db is None:
        print("Database offline.")
        return

    cat = db.categories.find_one({'slug': 'salwar-kameez'})
    if not cat:
        cat_res = db.categories.insert_one({
            'name': 'Salwar Kameez',
            'slug': 'salwar-kameez',
            'description': 'Luxury Designer Salwar Kameez',
            'image': './assets/images/anarkali_maroon.png',
            'is_active': True,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        })
        cat_id = str(cat_res.inserted_id)
    else:
        cat_id = str(cat['_id'])

    sample_products = [
        {
            'name': 'Noor Ivory Embroidered Suit',
            'slug': 'noor-ivory-embroidered-suit',
            'sku': 'RA-NOOR-01',
            'short_description': 'Traditional ivory straight salwar kameez.',
            'description': 'Celebrate heritage craftsmanship with Noor Embroidered Suit.',
            'category_id': cat_id,
            'subcategory': 'Pakistani Suits',
            'price': 4899.0,
            'original_price': 5499.0,
            'discount_percentage': 10.0,
            'stock': 20,
            'sizes': ['S', 'M', 'L', 'XL'],
            'colors': ['Ivory', 'Gold'],
            'fabric': 'Chiffon & Lace',
            'occasion': 'Wedding Couture',
            'brand': 'Royal Affair',
            'thumbnail': './assets/images/anarkali_maroon.png',
            'images': ['./assets/images/anarkali_maroon.png'],
            'featured': True,
            'bestseller': True,
            'new_arrival': True,
            'status': 'published',
            'is_active': True,
            'is_deleted': False,
            'rating': 4.9,
            'review_count': 28,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        },
        {
            'name': 'Zoya Plum Velvet Anarkali',
            'slug': 'zoya-plum-velvet-anarkali',
            'sku': 'RA-ZOYA-02',
            'short_description': 'Luxury plum velvet Anarkali gown.',
            'description': 'Deep plum velvet Anarkali set with gold zari work.',
            'category_id': cat_id,
            'subcategory': 'Anarkali Suits',
            'price': 8999.0,
            'original_price': 10999.0,
            'discount_percentage': 18.0,
            'stock': 15,
            'sizes': ['M', 'L', 'XL'],
            'colors': ['Plum', 'Deep Maroon'],
            'fabric': 'Pure Silk Velvet',
            'occasion': 'Bridal Wear',
            'brand': 'Royal Affair',
            'thumbnail': './assets/images/sharara_plum.png',
            'images': ['./assets/images/sharara_plum.png'],
            'featured': True,
            'bestseller': True,
            'new_arrival': False,
            'status': 'published',
            'is_active': True,
            'is_deleted': False,
            'rating': 4.8,
            'review_count': 42,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        },
        {
            'name': 'Meher Gold Palazzo Suit',
            'slug': 'meher-gold-palazzo-suit',
            'sku': 'RA-MEHER-03',
            'short_description': 'Royal gold woven palazzo suit set.',
            'description': 'Intricately embroidered gold palazzo suit for festive occasions.',
            'category_id': cat_id,
            'subcategory': 'Palazzo Suit',
            'price': 6499.0,
            'original_price': 7499.0,
            'discount_percentage': 13.0,
            'stock': 12,
            'sizes': ['S', 'M', 'L'],
            'colors': ['Gold', 'Cream'],
            'fabric': 'Raw Silk',
            'occasion': 'Festive Wear',
            'brand': 'Royal Affair',
            'thumbnail': './assets/images/palazzo_gold.png',
            'images': ['./assets/images/palazzo_gold.png'],
            'featured': False,
            'bestseller': True,
            'new_arrival': True,
            'status': 'published',
            'is_active': True,
            'is_deleted': False,
            'rating': 4.7,
            'review_count': 19,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
    ]

    for p in sample_products:
        db.products.update_one({'sku': p['sku']}, {'$set': p}, upsert=True)

    print('Seeded luxury products successfully!')
    close_mongo_connection()

if __name__ == '__main__':
    seed()
