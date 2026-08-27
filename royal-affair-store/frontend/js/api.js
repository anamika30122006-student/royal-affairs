/**
 * Image Fallback Handler for broken image URLs
 * Logs broken URL to console and sets default placeholder.
 */
function handleImageError(imgElement) {
  if (imgElement) {
    imgElement.onerror = null; // Prevent infinite loop
    const brokenUrl = imgElement.src || imgElement.getAttribute('src') || '';
    if (brokenUrl) {
      console.error("Storefront product image failed to load:", brokenUrl);
    }
    imgElement.src = './assets/images/anarkali_maroon.jpg';
  }
}

/**
 * Storefront Image URL Resolver
 * Formats full URLs, relative /uploads paths, and local assets.
 */
function resolveStorefrontImg(img) {
  const fallback = './assets/images/anarkali_maroon.jpg';
  if (!img || typeof img !== 'string') return fallback;
  const clean = img.trim();
  if (!clean) return fallback;

  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    return clean;
  }
  if (clean.startsWith('/uploads/')) {
    return 'http://127.0.0.1:8000' + clean;
  }
  if (clean.startsWith('uploads/')) {
    return 'http://127.0.0.1:8000/' + clean;
  }
  if (clean.startsWith('./assets/')) {
    return clean;
  }
  if (clean.startsWith('assets/')) {
    return './' + clean;
  }
  if (clean.startsWith('/assets/')) {
    return '.' + clean;
  }
  return clean;
}

/**
 * Shared Product Image Resolver
 * Inspects product image fields (thumbnail, image, images[0], uploaded_image, cover_image).
 * Supports full URLs and relative /uploads paths. Does NOT use collection cover images.
 */
function resolveProductImage(prodOrUrl, index = 0) {
  const fallback = './assets/images/anarkali_maroon.jpg';
  if (!prodOrUrl) return fallback;

  if (typeof prodOrUrl === 'string') {
    return resolveStorefrontImg(prodOrUrl);
  }

  if (typeof prodOrUrl === 'object') {
    // If index > 0 requested (e.g. hover image), check gallery images array first
    if (index > 0 && Array.isArray(prodOrUrl.images) && prodOrUrl.images.length > index && prodOrUrl.images[index]) {
      return resolveStorefrontImg(prodOrUrl.images[index]);
    }

    // Identify candidate image field from product response
    const candidate = prodOrUrl.thumbnail ||
                      prodOrUrl.image ||
                      (Array.isArray(prodOrUrl.images) && prodOrUrl.images.length > 0 ? prodOrUrl.images[0] : null) ||
                      prodOrUrl.uploaded_image ||
                      prodOrUrl.cover_image ||
                      prodOrUrl.imageUrl ||
                      prodOrUrl.image_url ||
                      prodOrUrl.img ||
                      null;

    if (candidate) {
      return resolveStorefrontImg(candidate);
    }
  }

  return fallback;
}

// Attach to window object for global storefront usage
if (typeof window !== 'undefined') {
  window.handleImageError = handleImageError;
  window.resolveStorefrontImg = resolveStorefrontImg;
  window.resolveProductImage = resolveProductImage;
}

/**
 * Normalize product object to unify API responses and local fallback objects
 */
function normalizeProduct(prod) {
  if (!prod) return null;

  const mainImage = resolveProductImage(prod, 0);
  const hoverImage = resolveProductImage(prod, 1);
  const imagesList = (Array.isArray(prod.images) && prod.images.length > 0)
    ? prod.images.map(img => resolveStorefrontImg(img))
    : [mainImage, hoverImage];

  return {
    id: prod.id || prod._id || 1,
    name: prod.name || "Royal Suit",
    slug: prod.slug || "",
    category: prod.category || prod.category_id || "Salwar Kameez",
    category_id: prod.category_id || prod.category || "",
    price: typeof prod.price === "number" ? prod.price : parseFloat(prod.price) || 0,
    originalPrice: prod.original_price || prod.originalPrice || null,
    discount: prod.discount_percentage || prod.discount || 0,
    rating: prod.rating || 4.8,
    reviewCount: prod.review_count || prod.reviewCount || 14,
    sku: prod.sku || "",
    stock: typeof prod.stock === "number" ? prod.stock : (prod.stock !== undefined ? parseInt(prod.stock) : 10),
    images: imagesList,
    thumbnail: mainImage,
    colors: (prod.colors && prod.colors.length > 0) ? prod.colors : ["Plum", "Maroon", "Gold"],
    sizes: (prod.sizes && prod.sizes.length > 0) ? prod.sizes : ["S", "M", "L", "XL"],
    fabric: prod.fabric || "Pure Silk",
    occasion: prod.occasion || "Wedding Couture",
    featured: prod.featured || prod.is_featured || false,
    bestseller: prod.bestseller || prod.is_best_seller || false,
    newArrival: prod.new_arrival || prod.newArrival || false,
    shortDescription: prod.short_description || prod.shortDescription || prod.description || "",
    fullDescription: prod.description || prod.fullDescription || prod.shortDescription || ""
  };
}


/**
 * Fetch Products from FastAPI Backend
 */
async function fetchProductsFromAPI(queryParams = {}) {
  try {
    const url = new URL(`${API_BASE_URL}/products`);
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] !== undefined && queryParams[key] !== null && queryParams[key] !== '') {
        url.searchParams.append(key, queryParams[key]);
      }
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawProducts = data.products || (Array.isArray(data) ? data : []);
    const normalizedProducts = rawProducts.map(normalizeProduct);

    return {
      success: true,
      total: data.total !== undefined ? data.total : normalizedProducts.length,
      page: data.page || 1,
      limit: data.limit || 12,
      totalPages: data.total_pages || 1,
      products: normalizedProducts
    };
  } catch (error) {
    console.warn("FastAPI Backend unavailable. Utilizing fallback product database.", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Single Product by ID or Slug from FastAPI Backend
 */
async function fetchProductByIdFromAPI(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`);
    if (!response.ok) {
      throw new Error(`Product not found: ${response.status}`);
    }
    const data = await response.json();
    return { success: true, product: normalizeProduct(data) };
  } catch (error) {
    console.warn(`FastAPI fetch product by ID '${productId}' failed. Using fallback.`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Single Product by Slug from FastAPI Backend
 */
async function fetchProductBySlugFromAPI(slug) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${slug}`);
    if (!response.ok) {
      throw new Error(`Product not found for slug '${slug}': ${response.status}`);
    }
    const data = await response.json();
    return { success: true, product: normalizeProduct(data) };
  } catch (error) {
    console.warn(`FastAPI fetch product by slug '${slug}' failed. Using fallback.`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Categories from FastAPI Backend
 */
async function fetchCategoriesFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error(`Categories fetch failed: ${response.status}`);
    }
    const data = await response.json();
    return { success: true, categories: data };
  } catch (error) {
    console.warn("FastAPI fetch categories failed. Using fallback.", error);
    return { success: false, error: error.message };
  }
}

/**
 * Main wrapper function to get products (tries API first, falls back to local products array)
 */
async function getProducts(params = {}) {
  const apiResult = await fetchProductsFromAPI(params);
  if (apiResult.success && apiResult.products && apiResult.products.length > 0) {
    return apiResult;
  }

  // Fallback to local products array from js/products.js
  if (typeof products !== "undefined" && Array.isArray(products)) {
    let filtered = products.map(normalizeProduct);

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.fabric.toLowerCase().includes(q));
    }

    if (params.category) {
      const cat = params.category.toLowerCase();
      filtered = filtered.filter(p => p.category.toLowerCase().includes(cat));
    }

    if (params.featured) {
      filtered = filtered.filter(p => p.featured);
    }
    if (params.new_arrival || params.newArrival) {
      filtered = filtered.filter(p => p.newArrival);
    }
    if (params.bestseller) {
      filtered = filtered.filter(p => p.bestseller);
    }

    if (params.min_price) {
      filtered = filtered.filter(p => p.price >= parseFloat(params.min_price));
    }
    if (params.max_price) {
      filtered = filtered.filter(p => p.price <= parseFloat(params.max_price));
    }

    const page = params.page || 1;
    const limit = params.limit || 12;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      total: total,
      page: page,
      limit: limit,
      totalPages: totalPages,
      products: paginated,
      isFallback: true
    };
  }

  return { success: false, total: 0, page: 1, limit: 12, totalPages: 0, products: [] };
}

/**
 * Main wrapper to get single product by ID or Slug
 */
async function getProductByIdOrSlug(idOrSlug) {
  if (!idOrSlug) return null;
  const clean = String(idOrSlug).trim();

  // Try API fetch by Slug first, then ID
  let apiRes = await fetchProductBySlugFromAPI(clean);
  if (apiRes.success && apiRes.product) return apiRes.product;

  apiRes = await fetchProductByIdFromAPI(clean);
  if (apiRes.success && apiRes.product) return apiRes.product;

  // Fallback to local dataset
  if (typeof products !== "undefined" && Array.isArray(products)) {
    const found = products.find(p => p.slug === clean || String(p.id) === clean || (p.sku && p.sku.toLowerCase() === clean.toLowerCase()));
    if (found) return normalizeProduct(found);
  }

  return null;
}

/**
 * UI Skeleton & Error State Generators
 */
function getLoadingSkeletonHTML(count = 4) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="product-card skeleton-card" style="padding: 1rem; border: 1px solid rgba(212,175,55,0.2); border-radius: 4px; background: #fafafa;">
        <div style="width: 100%; height: 260px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: skeletonLoading 1.5s infinite; border-radius: 4px; margin-bottom: 1rem;"></div>
        <div style="width: 60%; height: 16px; background: #e0e0e0; margin-bottom: 8px; border-radius: 2px;"></div>
        <div style="width: 85%; height: 20px; background: #e0e0e0; margin-bottom: 12px; border-radius: 2px;"></div>
        <div style="width: 40%; height: 18px; background: #e0e0e0; border-radius: 2px;"></div>
      </div>
    `;
  }
  return html;
}

function getEmptyStateHTML(message = "No products found matching your request.") {
  return `
    <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: #fff; border: 1px dashed rgba(212,175,55,0.4); border-radius: 8px; margin: 2rem 0;">
      <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--color-gold)" stroke-width="1.5" fill="none" style="margin-bottom: 1rem; opacity: 0.8;">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <h3 style="font-family: var(--font-heading); color: var(--color-maroon); font-size: 1.5rem; margin-bottom: 0.5rem;">No Suits Found</h3>
      <p style="color: var(--color-charcoal-light); font-size: 0.9rem; max-width: 400px; margin: 0 auto 1.5rem auto;">${message}</p>
      <button onclick="window.location.reload()" class="btn btn-secondary btn-sm" style="background: var(--color-gold); color: #1a0505; font-weight: 700; border-color: var(--color-gold);">Reset & Retry</button>
    </div>
  `;
}

function getErrorStateHTML(message = "Unable to connect to product catalog.", retryFn = "window.location.reload()") {
  return `
    <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; background: #fff5f5; border: 1px solid #fecaca; border-radius: 8px; margin: 2rem 0;">
      <svg viewBox="0 0 24 24" width="48" height="48" stroke="#dc2626" stroke-width="1.5" fill="none" style="margin-bottom: 1rem;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h3 style="font-family: var(--font-heading); color: #991b1b; font-size: 1.4rem; margin-bottom: 0.5rem;">Connection Error</h3>
      <p style="color: #7f1d1d; font-size: 0.9rem; max-width: 450px; margin: 0 auto 1.5rem auto;">${message}</p>
      <button onclick="${retryFn}" class="btn btn-secondary btn-sm" style="background: #dc2626; color: #fff; border-color: #dc2626; font-weight: 700;">Retry Connection</button>
    </div>
  `;
}
