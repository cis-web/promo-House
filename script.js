// گۆڕاوە گشتییەکان
let isAdminLoggedIn = false;
window.isAdminLoggedIn = false;
window.globalProductsData = null;
let currentEditingProductId = null;
let globalProductsData = null;
let currentCategory = null;
let promoData = null;
let selectedImages = [];
let currentEditingImages = [];
let menuCurrentCategory = null;
let zoomImages = [];
let currentZoomIndex = 0;
let promoSlideInterval;
let currentMainTab = 'all';
let firebaseInitialized = false;

// وێنەی placeholder بە SVG base64 - ئەمە هەرگیز کێشە دروست ناکات
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="18" fill="%23999" text-anchor="middle" dy=".3em"%3E%D9%87%DB%8C%DA%86 %D9%88%DB%8E%D9%86%DB%95%DB%8C%DB%95%DA%A9 %D9%86%DB%8C%DB%8C%DB%95%3C/text%3E%3C/svg%3E';

// فەنکشنە سەرەکییەکان
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // چاوەڕوانی بۆ چالاککردنی Firebase
    const checkFirebase = setInterval(() => {
        if (window.firebase) {
            clearInterval(checkFirebase);
            firebaseInitialized = true;
            console.log("Firebase is ready!");
            loadProductsFromFirebase();
            loadPromoFromFirebase();
            setupRealtimeListeners();
        }
    }, 100);
}

function setupEventListeners() {
    // دوگمەی بەڕێوەبەر
    document.getElementById('adminPanelBtn').addEventListener('click', toggleAdminPanel);
    
    // فۆرمی داواکاری
    document.getElementById('customerRequestForm').addEventListener('submit', submitCustomerRequest);
    
    // فۆرمی فرۆشیار
    document.getElementById('sellerProductForm').addEventListener('submit', submitSellerProduct);
    
    // فۆرمی زیادکردنی کالا
    document.getElementById('productForm').addEventListener('submit', submitProductForm);
    
    // فۆرمی ڕیکلام
    document.getElementById('promoForm').addEventListener('submit', submitPromoForm);
    
    // مۆدالەکان
    document.getElementById('closeAboutBtn').addEventListener('click', () => {
        document.getElementById('aboutPage').style.display = 'none';
        showHomePage();
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('phoneModal').style.display = 'none';
    });
    
    document.getElementById('closeFibModalBtn').addEventListener('click', () => {
        document.getElementById('fibModal').style.display = 'none';
    });
    
    document.getElementById('loginBtn').addEventListener('click', loginAdmin);
    document.getElementById('cancelLoginBtn').addEventListener('click', () => {
        document.getElementById('loginModal').style.display = 'none';
    });
}

// فانکشنی داخستنی modal ـی جۆری کاڵاکان
window.closeOrdersModal = function() {
    document.getElementById('ordersPage').style.display = 'none';
    showHomePage();
};

// فەنکشنەکانی Firebase
async function loadProductsFromFirebase() {
    try {
        const productsRef = firebase.ref(firebase.db, 'products');
        const snapshot = await firebase.get(productsRef);
        globalProductsData = snapshot.val();
        window.globalProductsData = globalProductsData;
        
        // ✅ نوێکردنەوەی نیشاندان بەپێی بەشی ئێستا
        if (currentMainTab === 'all') {
            displayProducts(globalProductsData);
        }
        
        // ✅ ئەگەر لیستی بەڕێوەبەر کراوەیە، ئەویش نوێ بکەرەوە
        const allProductsSection = document.getElementById('allProductsSection');
        if (allProductsSection && allProductsSection.style.display !== 'none') {
            displayAllProducts(globalProductsData);
        }
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

async function loadPromoFromFirebase() {
    try {
        const promoRef = firebase.ref(firebase.db, 'promo');
        const snapshot = await firebase.get(promoRef);
        promoData = snapshot.val();
        
        if (promoData) {
            updatePromoBanner(promoData);
        }
    } catch (error) {
        console.error("Error loading promo:", error);
    }
}

function setupRealtimeListeners() {
    if (!firebaseInitialized) return;

    // چاودێری داواکارییەکانی کڕیار
    const customerRequestsRef = firebase.ref(firebase.db, 'customerRequests');
    firebase.onValue(customerRequestsRef, (snapshot) => {
        updateAdminDashboard();
        updateNotificationBadge();
    });

    // چاودێری کالاکانی فرۆشیار
    const sellerProductsRef = firebase.ref(firebase.db, 'sellerProducts');
    firebase.onValue(sellerProductsRef, (snapshot) => {
        updateAdminDashboard();
        updateNotificationBadge();
    });

    // چاودێری کۆپی کراوەکان
    const copiedSellerRef = firebase.ref(firebase.db, 'copiedSellerProducts');
    firebase.onValue(copiedSellerRef, (snapshot) => {
        if (currentMainTab === 'seller') {
            loadAndShowCopiedSellerProducts();
        }
    });
    
    const copiedCustomerRef = firebase.ref(firebase.db, 'copiedCustomerRequests');
    firebase.onValue(copiedCustomerRef, (snapshot) => {
        if (currentMainTab === 'customer') {
            loadAndShowCopiedCustomerRequests();
        }
    });
}

// فەنکشنەکانی نیشاندانی کالاکان
function displayProducts(productsData, category = null) {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!productsData) {
        container.innerHTML = '<div class="col-span-2 text-center py-8"><p class="text-gray-500">هیچ کالایەک بوونی نیە</p></div>';
        return;
    }
    
    const products = Object.values(productsData);
    
    if (category && category !== 'هەمووکاڵاکان') {
        const filteredProducts = products.filter(product => product.category === category);
        if (filteredProducts.length === 0) {
            container.innerHTML = `<div class="col-span-2 text-center py-8"><p class="text-gray-500">هیچ کالایەک لەم کاتیگۆرییە بوونی نیە</p></div>`;
            return;
        }
        renderProducts(filteredProducts, container);
    } else {
        if (products.length === 0) {
            container.innerHTML = '<div class="col-span-2 text-center py-8"><p class="text-gray-500">هیچ کالایەک بوونی نیە</p></div>';
            return;
        }
        renderProducts(products, container);
    }
}

function renderProducts(products, container) {
    container.innerHTML = '';
    
    products.forEach((product, index) => {
        const productId = Object.keys(globalProductsData).find(key => globalProductsData[key] === product) || index;
        const images = product.images || (product.imageUrl ? [product.imageUrl] : []);
        const rawFirstImage = images.length > 0 ? images[0] : '' + PLACEHOLDER_IMAGE + '';
        
        // ✅ cache-busting بۆ وێنەی تازە
        const ts = product.updatedAt ? new Date(product.updatedAt).getTime() : (product.createdAt ? new Date(product.createdAt).getTime() : 0);
        const firstImage = (rawFirstImage !== PLACEHOLDER_IMAGE && ts > 0)
            ? (rawFirstImage.includes('?') ? `${rawFirstImage}&_t=${ts}` : `${rawFirstImage}?_t=${ts}`)
            : rawFirstImage;
        
        // دروستکردنی نامەی واتسئاپ کە لینکی وێنەکە و ناوی کاڵاکەی تێدایە
        const whatsappMsg = encodeURIComponent(
            `سڵاو، من ئارەزووی ئەم کاڵایەم هەیە:\n\n` +
            `📌 ناوی کاڵا: ${product.name}\n` +
            `🖼️ لینکی وێنە: ${firstImage}`
        );

        const productHTML = `
            <div class="two-column-product-card" data-product-index="${index}">
                <div class="product-image-container" onclick="showProductDetails('${productId}')" style="position: relative;">
                    <img src="${firstImage}" 
                         alt="${product.name}" 
                         class="product-image-clickable"
                         onerror="this.src='' + PLACEHOLDER_IMAGE + ''">
             ${images.length > 1 ? `

                    ` : ''}
                    
                    <!-- دوگمەی چاو لە سەرەوەی وێنە -->
                 <button onclick="event.stopPropagation(); showPriceOnly('${productId}')" 
        class="absolute top-2 left-2 bg-[#39C7F7]/90 hover:bg-[#2fb6e4] text-white p-1.5 rounded-full shadow-lg transition-all z-10 backdrop-blur-sm"
        title="بینینی نرخ">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
    </svg>
</button>

                </div>
                
                <div class="two-column-product-info">
                    <h4 onclick="showProductDetails('${productId}')" style="cursor:pointer; font-weight: bold; margin-bottom: 8px;">
                        ${product.name}
                    </h4>
                    
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <button onclick="showProductDetails('${productId}')" 
                        class="bg-[#39C7F7] hover:bg-[#2FB6E6] text-white py-2 rounded-lg font-medium transition-all text-xs flex items-center justify-center gap-1"
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            زانیاری
                        </button>
                        
                        <a href="https://wa.me/9647701922060?text=${whatsappMsg}" 
                           target="_blank"
                           class="bg-green-500 text-white py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333 .157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411"/>
                            </svg>
                            واتسئاپ
                        </a>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += productHTML;
    });
}

// فەنکشنەکانی بانەری ڕیکلام
function updatePromoBanner(promoData) {
    const container = document.getElementById('promoImagesContainer');
    const indicators = document.getElementById('promoIndicators');
    
    if (!container || !indicators || !promoData) return;
    
    container.innerHTML = '';
    indicators.innerHTML = '';
    
    const images = promoData.images || [];
    
    if (images.length === 0) return;
    
    images.forEach((image, index) => {
        const imgElement = document.createElement('img');
        imgElement.src = image;
        imgElement.className = `promo-image-slide ${index === 0 ? 'active' : ''}`;
        imgElement.alt = `Promo image ${index + 1}`;
        container.appendChild(imgElement);
        
        const indicator = document.createElement('div');
        indicator.className = `promo-indicator ${index === 0 ? 'active' : ''}`;
        indicator.onclick = () => changePromoSlide(index);
        indicators.appendChild(indicator);
    });
    
    document.getElementById('promoBannerTitle').textContent = promoData.title || '';
    document.getElementById('promoBannerSubtitle').textContent = promoData.subtitle || '';
    document.getElementById('promoBannerDiscount').textContent = promoData.discountText || '';
    
    startPromoSlideshow(images.length);
}

function startPromoSlideshow(totalSlides) {
    if (promoSlideInterval) {
        clearInterval(promoSlideInterval);
    }
    
    let currentSlide = 0;
    
    promoSlideInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % totalSlides;
        changePromoSlide(currentSlide);
    }, 5000);
}

function changePromoSlide(index) {
    const slides = document.querySelectorAll('.promo-image-slide');
    const indicators = document.querySelectorAll('.promo-indicator');
    
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    if (slides[index]) {
        slides[index].classList.add('active');
    }
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }
}

// فەنکشنەکانی دوگمەکانی خوارەوە
window.showHomePage = function() {
    updateBottomNavActive('bottomHomeBtn');
    
    document.getElementById('allProductsSection').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'none';
    document.getElementById('addPromoForm').style.display = 'none';
    document.getElementById('requestFormSection').style.display = 'none';
    document.getElementById('sellerProductFormSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('mainProductsSection').style.display = 'block';
    document.getElementById('servicesSection').style.display = 'block';
    document.getElementById('mainTabs').style.display = 'flex';
    
    document.getElementById('productsTitle').textContent = 'هەموو کالاکان';
    
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.main-tab-btn')[0].classList.add('active');
    
    currentMainTab = 'all';
    displayProducts(globalProductsData);
    
    closeAllModals();
    window.scrollTo(0, 0);
};

window.showRequestPage = function() {
    updateBottomNavActive('bottomRequestBtn');
    
    document.getElementById('allProductsSection').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'none';
    document.getElementById('addPromoForm').style.display = 'none';
    document.getElementById('sellerProductFormSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('mainProductsSection').style.display = 'none';
    document.getElementById('servicesSection').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
    document.getElementById('requestFormSection').style.display = 'block';
    
    closeAllModals();
    document.getElementById('requestFormSection').scrollIntoView({ behavior: 'smooth' });
};

window.showSellerProductPage = function() {
    updateBottomNavActive('bottomAddProductBtn');
    
    document.getElementById('allProductsSection').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'none';
    document.getElementById('addPromoForm').style.display = 'none';
    document.getElementById('requestFormSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('mainProductsSection').style.display = 'none';
    document.getElementById('servicesSection').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
    document.getElementById('sellerProductFormSection').style.display = 'block';
    
    closeAllModals();
    document.getElementById('sellerProductFormSection').scrollIntoView({ behavior: 'smooth' });
};

window.showOrdersPage = function() {
    updateBottomNavActive('bottomOrdersBtn');
    
    const orderTimeElement = document.getElementById('orderTime');
    if (orderTimeElement) {
        const now = new Date();
        const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0');
        orderTimeElement.textContent = timeString;
        orderTimeElement.style.display = 'block';
    }
    
    document.getElementById('ordersPage').style.display = 'flex';
    showMenuCategories();
    
    const adminSection = document.getElementById('adminOrdersSection');
    if (adminSection) {
        if (isAdminLoggedIn) {
            adminSection.style.display = 'block';
            loadOrdersFromFirebase();
        } else {
            adminSection.style.display = 'none';
        }
    }
    
    document.getElementById('allProductsSection').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'none';
    document.getElementById('addPromoForm').style.display = 'none';
    document.getElementById('requestFormSection').style.display = 'none';
    document.getElementById('sellerProductFormSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('mainProductsSection').style.display = 'none';
    document.getElementById('servicesSection').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
};

window.showAboutPage = function() {
    updateBottomNavActive('bottomAboutBtn');
    document.getElementById('aboutPage').style.display = 'flex';
    
    document.getElementById('allProductsSection').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'none';
    document.getElementById('addPromoForm').style.display = 'none';
    document.getElementById('requestFormSection').style.display = 'none';
    document.getElementById('sellerProductFormSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('mainProductsSection').style.display = 'none';
    document.getElementById('servicesSection').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
};

// فەنکشنەکانی مینۆی کاتیگۆرییەکان
window.openCategoryForm = function(category) {
    document.getElementById('ordersPage').style.display = 'none';
    
    const promoBanner = document.getElementById('promoBanner');
    if (promoBanner) promoBanner.style.display = 'none';
    
    const mainTabs = document.getElementById('mainTabs');
    if (mainTabs) mainTabs.style.display = 'none';
    
    const servicesSection = document.getElementById('servicesSection');
    if (servicesSection) servicesSection.style.display = 'none';
    
    document.getElementById('mainProductsSection').style.display = 'block';
    document.getElementById('requestFormSection').style.display = 'none';
    document.getElementById('sellerProductFormSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('copiedProductsSection').style.display = 'none';
    
    updateBottomNavActive('bottomHomeBtn');
    
    setTimeout(() => {
        if (category === 'هەموکاڵاکان') {
            displayProducts(globalProductsData);
            document.getElementById('productsTitle').textContent = 'هەموو کالاکان';
        } else {
            displayProducts(globalProductsData, category);
            document.getElementById('productsTitle').textContent = `کالاکانی ${category}`;
        }
    }, 100);
};

function showMenuCategories() {
    document.getElementById('menuProductsContainer').style.display = 'none';
    document.getElementById('menuCategoriesGrid').style.display = 'grid';
}

// فانکشنی نوێ: پیشاندانی کاڵاکانی کاتیگۆری لە ناو modal
window.showCategoryInModal = function(category) {
    // شاردنەوەی لیستی کاتیگۆرییەکان
    document.getElementById('menuCategoriesGrid').style.display = 'none';
    
    // پیشاندانی بەشی کاڵاکان
    const menuProductsContainer = document.getElementById('menuProductsContainer');
    const menuProductsList = document.getElementById('menuProductsList');
    const menuCategoryName = document.getElementById('menuCategoryName');
    
    menuProductsContainer.style.display = 'block';
    menuCategoryName.textContent = category;
    menuProductsList.innerHTML = '<p class="text-center text-gray-500 py-8">بارکردنی کاڵاکان...</p>';
    
    // بارکردنی کاڵاکان لە Firebase
    if (!globalProductsData) {
        menuProductsList.innerHTML = '<p class="text-center text-red-500 py-8">هەڵە لە بارکردنی کاڵاکان</p>';
        return;
    }
    
    // فلتەر کردنی کاڵاکان بەپێی کاتیگۆری
    const products = Object.values(globalProductsData);
    let filteredProducts = products;
    
    if (category !== 'هەمووکاڵاکان') {
        filteredProducts = products.filter(p => p.category === category);
    }
    
    // پیشاندانی کاڵاکان
    menuProductsList.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        menuProductsList.innerHTML = '<p class="text-center text-gray-500 py-8">هیچ کاڵایەک لەم کاتیگۆرییە بوونی نیە</p>';
        return;
    }
    
    filteredProducts.forEach((product) => {
        // 🔧 دۆزینەوەی productId ی ڕاستەقینە بە بەراوردکردنی ناوی کاڵا
        let productId = null;
        for (const [key, value] of Object.entries(globalProductsData)) {
            if (value.name === product.name && 
                value.price === product.price && 
                value.category === product.category) {
                productId = key;
                break;
            }
        }
        
        // ئەگەر نەدۆزرایەوە، لۆگ بکە
        if (!productId) {
            console.error("❌ Could not find productId for:", product.name);
            return; // skip this product
        }
        
        const images = product.images || (product.imageUrl ? [product.imageUrl] : []);
        const firstImage = images[0] || '' + PLACEHOLDER_IMAGE + '';
        
        const whatsappMsg = encodeURIComponent(
            `سڵاو، من ئارەزووی ئەم کاڵایەم هەیە:\n\n` +
            `📌 ناوی کاڵا: ${product.name}\n` +
            `🖼️ لینکی وێنە: ${firstImage}`
        );
        
        const productHTML = `
            <div class="two-column-product-card">
                <div class="product-image-container" onclick="showProductDetails('${productId}')">
                    <img src="${firstImage}" 
                         alt="${product.name}" 
                         class="product-image-clickable"
                         onerror="this.src='' + PLACEHOLDER_IMAGE + ''">
                    ${images.length > 1 ? `
               
                    ` : ''}
                </div>
                
                <div class="two-column-product-info">
                    <h4 onclick="showProductDetails('${productId}')" style="cursor:pointer; font-weight: bold; margin-bottom: 8px;">
                        ${product.name}
                    </h4>
                    
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <button onclick="showProductDetails('${productId}')" 
                        class="bg-[#39C7F7] hover:bg-[#2FB6E6] text-white py-2 rounded-lg font-medium transition-all text-xs flex items-center justify-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            زانیاری
                        </button>
                        
                        <a href="https://wa.me/9647701922060?text=${whatsappMsg}" 
                           target="_blank"
                           class="bg-green-500 text-white py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333 .157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411"/>
                            </svg>
                            واتسئاپ
                        </a>
                    </div>
                </div>
            </div>
        `;
        menuProductsList.innerHTML += productHTML;
    });
};

function backToMenuCategories() {
    // ئەگەر لە menuProductsContainer بوو
    const menuContainer = document.getElementById('menuProductsContainer');
    if (menuContainer && menuContainer.style.display !== 'none') {
        menuContainer.style.display = 'none';
        document.getElementById('menuCategoriesGrid').style.display = 'grid';
        return;
    }
    
    // ئەگەر لە mainProductsSection بوو (کاتێک لە کاتیگۆرییەکانەوە هاتووە)
    const mainSection = document.getElementById('mainProductsSection');
    if (mainSection && mainSection.style.display !== 'none') {
        // شاردنەوەی بەشی کاڵاکان
        mainSection.style.display = 'none';
        
        // پیشاندانی modal ـی جۆری کاڵاکان
        document.getElementById('ordersPage').style.display = 'flex';
        
        // پیشاندانی دووبارەی بانەر و تابەکان
        const promoBanner = document.getElementById('promoBanner');
        if (promoBanner) promoBanner.style.display = 'block';
        
        const mainTabs = document.getElementById('mainTabs');
        if (mainTabs) mainTabs.style.display = 'flex';
        
        const servicesSection = document.getElementById('servicesSection');
        if (servicesSection) servicesSection.style.display = 'block';
    }
}

// فەنکشنەکانی داشبۆردی بەڕێوەبەر
function showAdminDashboard() {
    if (!isAdminLoggedIn) {
        showLoginModal();
        return;
    }
    
    document.getElementById('mainProductsSection').style.display = 'none';
    document.getElementById('servicesSection').style.display = 'none';
    document.getElementById('requestFormSection').style.display = 'none';
    document.getElementById('sellerProductFormSection').style.display = 'none';
    document.getElementById('allProductsSection').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'none';
    document.getElementById('addPromoForm').style.display = 'none';
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    updateBottomNavActive('bottomHomeBtn');
    updateAdminDashboard();
}

window.showAddProductFormFromDashboard = function() {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        showLoginModal();
        return;
    }
    
    resetProductForm();
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'block';
    
    document.getElementById('formTitle').textContent = 'زیادکردنی کالای نوێ';
    document.getElementById('submitText').textContent = 'زیادکردنی کالا';
    
    document.getElementById('addProductForm').scrollIntoView({ behavior: 'smooth' });
};

window.showAllProductsInDashboard = function() {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        showLoginModal();
        return;
    }
    
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'none';
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
    document.getElementById('allProductsSection').style.display = 'block';
    
    // ✅ هەمیشە داتای تازە لە Firebase بار بکە
    (async () => {
        try {
            const productsRef = firebase.ref(firebase.db, 'products');
            const snapshot = await firebase.get(productsRef);
            globalProductsData = snapshot.val();
            window.globalProductsData = globalProductsData;
            displayAllProducts(globalProductsData);
        } catch (error) {
            console.error("Error reloading products:", error);
            if (globalProductsData) {
                displayAllProducts(globalProductsData);
            }
        }
    })();
};

window.showPromoManagerFromDashboard = function() {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        showLoginModal();
        return;
    }
    
    showAddPromoForm();
};

window.showSellerProductsView = function() {
    if (!isAdminLoggedIn) {
        showLoginModal();
        return;
    }
    
    document.getElementById('sellerProductsView').style.display = 'flex';
    showSellerProductsTab('pending');
    loadSellerProductsForView();
    loadSellerProducts();
};

window.showCustomerRequestsView = function() {
    if (!isAdminLoggedIn) {
        showLoginModal();
        return;
    }
    
    document.getElementById('customerRequestsView').style.display = 'flex';
    showCustomerRequestsTab('pending');
    loadCustomerRequestsForView();
};

window.toggleAdminPanel = function() {
    if (!isAdminLoggedIn) {
        showLoginModal();
    } else {
        if (document.getElementById('adminDashboard').style.display === 'block') {
            showHomePage();
        } else {
            showAdminDashboard();
        }
    }
};

window.logoutAdmin = function() {
    if (confirm("دڵنیایت کە دەتەوێت دەربچیت؟")) {
        // ١. چوونە دەرەوە لە سێرڤەری فایربەیس
        window.firebase.auth.signOut().then(() => {
            // ٢. گۆڕینی بارودۆخی ئەپڵیکەیشنەکە لای خۆمان
            isAdminLoggedIn = false;
            window.isAdminLoggedIn = false;
            
            // ٣. سڕینەوەی زانیارییە خەزنکراوەکان لە براوسەردا
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminEmail');
            
            // ٤. گۆڕینی شێوەی سایتەکە بۆ دۆخی ئاسایی
            if (document.getElementById('adminPanelBtn')) {
                document.getElementById('adminPanelBtn').innerHTML = '+';
            }
            if (document.getElementById('promoAdminActions')) {
                document.getElementById('promoAdminActions').style.display = 'none';
            }
            
            showHomePage();
            alert("بە سەرکەوتوویی دەرچووت!");
            
            // ٥. ڕیفرێشکردن بۆ دڵنیایی لە پاکبوونەوەی هەموو دەسەڵاتەکان
            location.reload();
            
        }).catch((error) => {
            console.error("هەڵە لە کاتی چوونە دەرەوە:", error);
            alert("کێشەیەک ڕوویدا لە کاتی چوونە دەرەوە");
        });
    }
};

function showPromoManager() {
    showAddPromoForm();
}

function showApprovalManager() {
    if (!isAdminLoggedIn) {
        showLoginModal();
        return;
    }
    document.getElementById('approvalModal').style.display = 'flex';
    showTab('customerRequestsTab');
    loadCustomerRequests();
    loadSellerProducts();
}

function showOrdersManager() {
    if (isAdminLoggedIn) {
        document.getElementById('ordersPage').style.display = 'flex';
        document.getElementById('adminOrdersSection').style.display = 'block';
        loadOrdersFromFirebase();
    }
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

// لە ناو script.js ئەم بەشە بدۆزەرەوە و وەک ئەمەی خوارەوەی لێ بکە
async function loginAdmin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    console.log("🔍 هەوڵی چوونە ژوورەوە دەدرێت بۆ:", email);

    try {
        const userCredential = await window.firebase.signInWithEmailAndPassword(window.firebase.auth, email, password);
        const user = userCredential.user;

        if (user.uid === "3l1jy3cEF6OcVilOd5FXQFb68cs1" || user.uid === "U4995E3mjlQKH0QACZdnrY9khFs2") {
            isAdminLoggedIn = true;
            window.isAdminLoggedIn = true;
            
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminEmail', email);

            console.log("✅ بەسەرکەوتوویی چوویتە ژوورەوە");

            // داخستنی مۆدالی login
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'none';
            }

            // نوێکردنەوەی شێوەی سایتەکە بۆ ئەدمین
            checkAdminStatus();

            // پیشاندانی داشبۆردی بەڕێوەبەر
            showAdminDashboard();
            
            alert("بەخێربێیت بەڕێوەبەر");

        } else {
            alert("تۆ دەسەڵاتی بەڕێوەبەرت نییە");
            await window.firebase.auth.signOut();
        }
    } catch (error) {
        console.error("❌ هەڵە لە چوونە ژوورەوە:", error);
        alert("ئیمەیڵ یان وشەی نهێنی هەڵەیە");
    }
}

// ئەم فەنکشنە چیتر پێویست نییە چونکە Firebase Auth خۆی ئیشەکە دەکات
// بەڵام ئەگەر لە شوێنی تر بانگ کرابێت بە بەتاڵی جێی دەهێڵین
async function checkAdminCredentials(email, password) {
    return window.isAdminLoggedIn;
}

// پشکنینی دۆخی بەڕێوەبەر و نوێکردنەوەی UI
function checkAdminStatus() {
    console.log("🔍 پشکنینی دۆخی بەڕێوەبەر...");
    
    // نوێکردنەوەی دوگمەی بەڕێوەبەر
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if (adminPanelBtn) {
        if (isAdminLoggedIn) {
            adminPanelBtn.innerHTML = '<i class="fas fa-user-shield"></i> پانێڵی بەڕێوەبەر';
            adminPanelBtn.classList.add('admin-logged-in');
        } else {
            adminPanelBtn.innerHTML = '<i class="fas fa-lock"></i> چوونەژوورەوە';
            adminPanelBtn.classList.remove('admin-logged-in');
        }
    }
    
    // نوێکردنەوەی دوگمەکانی بەڕێوەبەر لە کارتی کاڵاکان
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const adminButtons = card.querySelector('.admin-buttons');
        if (adminButtons) {
            adminButtons.style.display = isAdminLoggedIn ? 'flex' : 'none';
        }
    });
    
    // نوێکردنەوەی بەشەکانی تایبەت بە بەڕێوەبەر
    const adminSections = document.querySelectorAll('.admin-only');
    adminSections.forEach(section => {
        section.style.display = isAdminLoggedIn ? 'block' : 'none';
    });
    
    console.log("✅ دۆخی بەڕێوەبەر نوێکرایەوە:", isAdminLoggedIn);
}

// فەنکشنەکانی تابەکانی سەرەمی
window.showMainTab = function(tab) {
    currentMainTab = tab;
    
    const promoBanner = document.getElementById('promoBanner');
    const promoBannerContainer = document.getElementById('promoBannerContainer');
    
    if (tab === 'all') {
        if (promoBanner) promoBanner.style.display = 'block';
        if (promoBannerContainer) promoBannerContainer.style.display = 'block';
        document.getElementById('productsTitle').textContent = 'هەموو کالاکان';
        displayProducts(globalProductsData);
    } else {
        if (promoBanner) promoBanner.style.display = 'none';
        if (promoBannerContainer) promoBannerContainer.style.display = 'none';
        
        if (tab === 'seller') {
            document.getElementById('productsTitle').textContent = 'کالای فرۆشیار (پەسەندکراو)';
            loadAndShowCopiedSellerProducts();
        } else if (tab === 'customer') {
            document.getElementById('productsTitle').textContent = 'داواکاری کڕیار (پەسەندکراو)';
            loadAndShowCopiedCustomerRequests();
        }
    }
    
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
};

// فەنکشنەکانی کۆپی کراوەکان
window.showCopiedProductsSection = function() {
    if (!isAdminLoggedIn) {
        showLoginModal();
        return;
    }
    
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('allProductsSection').style.display = 'none';
    document.getElementById('addProductForm').style.display = 'none';
    document.getElementById('addPromoForm').style.display = 'none';
    document.getElementById('requestFormSection').style.display = 'none';
    document.getElementById('sellerProductFormSection').style.display = 'none';
    document.getElementById('mainProductsSection').style.display = 'none';
    document.getElementById('servicesSection').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
    
    document.getElementById('copiedProductsSection').style.display = 'block';
    
    showCopiedTab('seller');
};

window.showCopiedTab = function(tab) {
    const tabBtns = document.querySelectorAll('#copiedProductsSection .tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active', 'border-b-2', 'border-blue-500');
    });
    
    document.getElementById('copiedSellerProducts').style.display = 'none';
    document.getElementById('copiedCustomerRequests').style.display = 'none';
    
    if (tab === 'seller') {
        document.querySelector('#copiedProductsSection .tab-btn:nth-child(1)').classList.add('active', 'border-b-2', 'border-blue-500');
        document.getElementById('copiedSellerProducts').style.display = 'grid';
        loadCopiedSellerProducts();
    } else if (tab === 'customer') {
        document.querySelector('#copiedProductsSection .tab-btn:nth-child(2)').classList.add('active', 'border-b-2', 'border-blue-500');
        document.getElementById('copiedCustomerRequests').style.display = 'grid';
        loadCopiedCustomerRequests();
    }
};

async function loadCopiedSellerProducts() {
    try {
        const productsRef = firebase.ref(firebase.db, 'copiedSellerProducts');
        const snapshot = await firebase.get(productsRef);
        const productsData = snapshot.val();
        
        const container = document.getElementById('copiedSellerProducts');
        container.innerHTML = '';
        
        if (!productsData) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-2 py-8">هیچ کالای فرۆشیار پەسەندکراو نیە</p>';
            return;
        }
        
        Object.entries(productsData).forEach(([productId, product]) => {
            const hasDiscount = product.originalPrice && product.discount;
            const discountPercentage = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
            const images = product.images || (product.imageUrl ? [product.imageUrl] : []);
            const firstImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop';
            
            const productCard = document.createElement('div');
            productCard.className = 'two-column-product-card';
            productCard.setAttribute('data-product-id', productId);
            
            productCard.innerHTML = `
                <div class="product-image-container">
                    <img src="${firstImage}" 
                         alt="${product.name}" 
                         class="product-image-clickable"
                         onclick="openImageModal('${firstImage}')"
                         onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop'">
                   ${images.length > 1 ? `
   
    </div>
                    ` : ''}
                </div>
                <div class="two-column-product-info">
                    <h4>${product.name}</h4>
                    ${hasDiscount ? `
                        <div class="flex items-center gap-1">
                            <span class="two-column-product-price">${product.price} دینار</span>
                            <span class="original-price">${product.originalPrice} دینار</span>
                            <span class="discount-label">${discountPercentage}% داشکاندن</span>
                        </div>
                    ` : `
                        <div class="two-column-product-price">${product.price} دینار</div>
                    `}
                    <small class="text-gray-500">نزیکەی $${product.priceUSD}</small>
                    ${product.category ? `<small class="text-gray-400 block mt-1">${product.category}</small>` : ''}
                    
                    <small class="text-green-600 block mt-2">🔰 پەسەندکراو لەلایەن بەڕێوەبەرەوە</small>
                    
                    <!-- دوگمەکانی دەستکاری و سڕینەوە (تەنها بۆ admin) -->
                    ${isAdminLoggedIn ? `
                    <div class="mt-3 flex gap-2">
                        <button class="edit-seller-btn text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                            دەستکاری
                        </button>
                        <button class="delete-seller-btn text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                            سڕینەوە
                        </button>
                    </div>
                    ` : ''}
                </div>
                
                <!-- زانیاری فرۆشیار لە ژێر کارتی کاڵا -->
                ${product.sellerName || product.sellerPhone || product.sellerAddress ? `
                <div class="seller-info-box" style="grid-column: 1 / -1; padding: 12px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; margin-top: 8px; border: 1px solid #bae6fd;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <svg style="width: 18px; height: 18px; color: #0284c7;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        <span style="font-weight: 600; color: #0c4a6e; font-size: 14px;">زانیاری فرۆشیار</span>
                    </div>
                    <div style="display: grid; gap: 6px; font-size: 13px;">
                        ${product.sellerName ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #0369a1; font-weight: 500;">ناو:</span>
                            <span style="color: #075985;">${product.sellerName}</span>
                        </div>
                        ` : ''}
                        ${product.sellerPhone ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #0369a1; font-weight: 500;">ژمارە:</span>
                            <a href="tel:${product.sellerPhone}" style="color: #0284c7; text-decoration: underline;">${product.sellerPhone}</a>
                        </div>
                        ` : ''}
                        ${product.sellerAddress ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #0369a1; font-weight: 500;">ناونیشان:</span>
                            <span style="color: #075985;">${product.sellerAddress}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            `;
            
            container.appendChild(productCard);
            
            if (isAdminLoggedIn) {
                const editBtn = productCard.querySelector('.edit-seller-btn');
                const deleteBtn = productCard.querySelector('.delete-seller-btn');
                
                if (editBtn) {
                    editBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        editCopiedSellerProduct(productId, product);
                    });
                }
                
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        deleteCopiedSellerProduct(productId);
                    });
                }
            }
        });
        
    } catch (error) {
        console.error("Error loading copied seller products:", error);
        const container = document.getElementById('copiedSellerProducts');
        if (container) {
            container.innerHTML = '<p class="text-red-500 text-center col-span-2 py-8">هەڵە لە بارکردنی کالاکان</p>';
        }
    }
}

async function loadCopiedCustomerRequests() {
    try {
        const requestsRef = firebase.ref(firebase.db, 'copiedCustomerRequests');
        const snapshot = await firebase.get(requestsRef);
        const requestsData = snapshot.val();
        
        const container = document.getElementById('copiedCustomerRequests');
        container.innerHTML = '';
        
        if (!requestsData) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-2 py-8">هیچ داواکاری پەسەندکراو نیە</p>';
            return;
        }
        
        Object.entries(requestsData).forEach(([requestId, request], index) => {
            const images = request.images || [];
            const firstImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop';
            
            const requestHTML = `
                <div class="two-column-product-card">
                    <div class="product-image-container">
                        <img src="${firstImage}" 
                             alt="${request.productName || 'ناونەزانراو'}" 
                             class="product-image-clickable"
                             onclick="openImageModal('${firstImage}')"
                             onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop'">
                        ${images.length > 1 ? `
                        
                            </div>
                        ` : ''}
                    </div>
                    <div class="two-column-product-info p-4">
                        <h4>${request.productName || 'ناونەزانراو'}</h4>
                        <div class="two-column-product-price">داواکاری پەسەندکراو</div>
                        
                        <div class="mt-3 space-y-2">
                            <p class="text-sm text-gray-600"><strong>کڕیار:</strong> ${request.customerName || 'ناونەزانراو'}</p>
                            <p class="text-sm text-gray-600"><strong>ژمارە:</strong> ${request.customerPhone || 'ناونەزانراو'}</p>
                            <p class="text-sm text-gray-600"><strong>شوێن:</strong> ${request.customerAddress || 'ناونەزانراو'}</p>
                            <p class="text-sm text-gray-600"><strong>ژمارەی کالا:</strong> ${request.quantity || '1'}</p>
                            ${request.productDescription ? `<p class="text-sm text-gray-600"><strong>شێواز:</strong> ${request.productDescription}</p>` : ''}
                        </div>
                        
                        ${images.length > 0 ? `<small class="text-blue-500 block mt-2">${images.length} وێنەی هەیە</small>` : ''}
                        <small class="text-green-600 block mt-4">✅ پەسەندکراو لەلایەن بەڕێوەبەرەوە</small>
                        <small class="text-gray-500 text-xs block mt-2">${new Date(request.reviewedAt || request.timestamp).toLocaleString('ku')}</small>
                        
                        <!-- دوگمەکانی دەستکاری و سڕینەوە (تەنها بۆ admin) -->
                        ${isAdminLoggedIn ? `
                        <div class="mt-3 flex gap-2">
                            <button onclick="editCopiedCustomerRequest('${requestId}', ${JSON.stringify(request).replace(/'/g, "\\'")})" 
                                    class="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                                دەستکاری
                            </button>
                            <button onclick="deleteCopiedCustomerRequest('${requestId}')" 
                                    class="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                                سڕینەوە
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            container.innerHTML += requestHTML;
        });
        
    } catch (error) {
        console.error("Error loading copied customer requests:", error);
    }
}

async function loadAndShowCopiedSellerProducts() {
    const container = document.getElementById('productsContainer');
    const title = document.getElementById('productsTitle');
    
    if (!container) return;
    
    container.innerHTML = '<div class="col-span-2 text-center py-8"><p class="text-gray-500">بارکردنی کالاکان...</p></div>';
    
    try {
        // 🔹 بارکردنی کاڵا پەسەندکراوەکان
        const productsRef = firebase.ref(firebase.db, 'copiedSellerProducts');
        const productsSnapshot = await firebase.get(productsRef);
        const productsData = productsSnapshot.val();
        
        // 🔹 بارکردنی داواکاریەکانی کڕیار
        const requestsRef = firebase.ref(firebase.db, 'customerRequests');
        const requestsSnapshot = await firebase.get(requestsRef);
        const requestsData = requestsSnapshot.val();
        
        container.innerHTML = '';
        
        // 🔹 پیشاندانی کاڵا پەسەندکراوەکان
        if (productsData) {
            const products = Object.values(productsData);
            products.forEach((product, index) => {
                const images = product.images || (product.imageUrl ? [product.imageUrl] : []);
                const firstImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop';
                
                const productHTML = `
                    <div class="two-column-product-card" data-product-index="${index}">
                        <div class="product-image-container">
                            <img src="${firstImage}" 
                                 alt="${product.name}" 
                                 class="product-image-clickable"
                                 onclick="openImageModal('${firstImage}')"
                                 onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop'">
                            ${images.length > 1 ? `
                          
                                </div>
                            ` : ''}
                        </div>
                        <div class="two-column-product-info">
                            <h4>${product.name}</h4>
                            <small class="text-green-600 block mt-2">🔰 پەسەندکراو لەلایەن بەڕێوەبەرەوە</small>
                        </div>
                        
                        <!-- زانیاری فرۆشیار لە ژێر کارتی کاڵا -->
                        ${product.sellerName || product.sellerPhone || product.sellerAddress ? `
                        <div class="seller-info-box" style="grid-column: 1 / -1; padding: 12px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; margin-top: 8px; border: 1px solid #bae6fd;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <svg style="width: 18px; height: 18px; color: #0284c7;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                <span style="font-weight: 600; color: #0c4a6e; font-size: 14px;">زانیاری فرۆشیار</span>
                            </div>
                            <div style="display: grid; gap: 6px; font-size: 13px;">
                                ${product.sellerName ? `
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="color: #0369a1; font-weight: 500;">ناو:</span>
                                    <span style="color: #075985;">${product.sellerName}</span>
                                </div>
                                ` : ''}
                                ${product.sellerPhone ? `
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="color: #0369a1; font-weight: 500;">ژمارە:</span>
                                    <a href="tel:${product.sellerPhone}" style="color: #0284c7; text-decoration: underline;">${product.sellerPhone}</a>
                                </div>
                                ` : ''}
                                ${product.sellerAddress ? `
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="color: #0369a1; font-weight: 500;">ناونیشان:</span>
                                    <span style="color: #075985;">${product.sellerAddress}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
                container.innerHTML += productHTML;
            });
        }
        
        // 🔹 پیشاندانی داواکاریەکانی کڕیار
        if (requestsData) {
            const requests = Object.values(requestsData);
            requests.forEach((request, index) => {
                const images = request.images || [];
                const firstImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop';
                
                const requestHTML = `
                    <div class="two-column-product-card" data-request-index="${index}" style="border: 2px solid #10b981;">
                        <div class="product-image-container">
                            <img src="${firstImage}" 
                                 alt="${request.productName}" 
                                 class="product-image-clickable"
                                 onclick="openImageModal('${firstImage}')"
                                 onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop'">
                            ${images.length > 1 ? `
                              
                                </div>
                            ` : ''}
                        </div>
                        <div class="two-column-product-info">
                            <h4>${request.productName}</h4>
                            <p class="text-sm text-gray-600 mt-1">${request.productDescription || ''}</p>
                            <div class="mt-2 text-xs text-gray-500">
                                <p>👤 ${request.customerName}</p>
                                <p>📞 ${request.customerPhone}</p>
                                <p>📍 ${request.customerAddress}</p>
                                <p>📦 ژمارە: ${request.quantity}</p>
                            </div>
                            <small class="text-blue-600 block mt-2">🛒 داواکاری کڕیار</small>
                        </div>
                    </div>
                `;
                container.innerHTML += requestHTML;
            });
        }
        
        // 🔹 ئەگەر هیچ شتێک نەبوو
        if (!productsData && !requestsData) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-8">
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <p class="text-gray-500 mb-4">هیچ کالایەک یان داواکاریەک بوونی نیە</p>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error("Error loading copied seller products:", error);
        container.innerHTML = `
            <div class="col-span-2 text-center py-8">
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p class="text-red-500 mb-4">هەڵە لە بارکردنی کالاکان</p>
                </div>
            </div>
        `;
    }
}

async function loadAndShowCopiedCustomerRequests() {
    const container = document.getElementById('productsContainer');
    const title = document.getElementById('productsTitle');
    
    if (!container) return;
    
    container.innerHTML = '<div class="col-span-2 text-center py-8"><p class="text-gray-500">بارکردنی داواکاریەکان...</p></div>';
    
    try {
        const requestsRef = firebase.ref(firebase.db, 'copiedCustomerRequests');
        const snapshot = await firebase.get(requestsRef);
        const requestsData = snapshot.val();
        
        container.innerHTML = '';
        
        if (!requestsData) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-8">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <p class="text-gray-500 mb-4">هیچ داواکاری پەسەندکراو بوونی نیە</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const requests = Object.values(requestsData);
        
        if (requests.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-8">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <p class="text-gray-500 mb-4">هیچ داواکاری پەسەندکراو بوونی نیە</p>
                    </div>
                </div>
            `;
            return;
        }
        
        requests.forEach((request, index) => {
            const images = request.images || [];
            const firstImage = images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop';
            
            const requestHTML = `
                <div class="two-column-product-card">
                    <div class="product-image-container">
                        <img src="${firstImage}" 
                             alt="${request.productName || 'ناونەزانراو'}" 
                             class="product-image-clickable"
                             onclick="openImageModal('${firstImage}')"
                             onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop'">
                        ${images.length > 1 ? `
                          
                        ` : ''}
                    </div>
                    <div class="two-column-product-info p-4">
                        <h4>${request.productName || 'ناونەزانراو'}</h4>
                        <div class="two-column-product-price"></div>
                        
                        <div class="mt-3 space-y-2">
                            <p class="text-sm text-gray-600"><strong>کڕیار:</strong> ${request.customerName || 'ناونەزانراو'}</p>
                            <p class="text-sm text-gray-600"><strong>ژمارە:</strong> ${request.customerPhone || 'ناونەزانراو'}</p>
                            <p class="text-sm text-gray-600"><strong>شوێن:</strong> ${request.customerAddress || 'ناونەزانراو'}</p>
                            <p class="text-sm text-gray-600"><strong>ژمارەی کالا:</strong> ${request.quantity || '1'}</p>
                            ${request.productDescription ? `<p class="text-sm text-gray-600"><strong>شێواز:</strong> ${request.productDescription}</p>` : ''}
                        </div>
                        
                        ${images.length > 0 ? `<small class="text-blue-500 block mt-2">${images.length} وێنەی هەیە</small>` : ''}
                        <small class="text-green-600 block mt-4">✅ پەسەندکراو لەلایەن بەڕێوەبەرەوە</small>
                        <small class="text-gray-500 text-xs block mt-2">${new Date(request.reviewedAt || request.timestamp).toLocaleString('ku')}</small>
                    </div>
                </div>
            `;
            container.innerHTML += requestHTML;
        });
        
    } catch (error) {
        console.error("Error loading copied customer requests:", error);
        container.innerHTML = `
            <div class="col-span-2 text-center py-8">
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p class="text-red-500 mb-4">هەڵە لە بارکردنی داواکاریەکان</p>
                </div>
            </div>
        `;
    }
}

window.backToHomeFromCopied = function() {
    document.getElementById('copiedProductsSection').style.display = 'none';
    
    const promoBannerContainer = document.getElementById('promoBannerContainer');
    if (promoBannerContainer) {
        promoBannerContainer.style.display = 'block';
    }
    
    if (isAdminLoggedIn) {
        showAdminDashboard();
    } else {
        showHomePage();
    }
};

// فەنکشنەکانی پەسەندکردن
async function loadCustomerRequests() {
    try {
        const requestsRef = firebase.ref(firebase.db, 'customerRequests');
        const snapshot = await firebase.get(requestsRef);
        const requestsData = snapshot.val();
        
        const container = document.getElementById('customerRequestsList');
        const countElement = document.getElementById('approvalNewCustomerRequestsCount');
        
        if (!requestsData) {
            if (container) container.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ داواکارییەک نیە</p>';
            if (countElement) countElement.textContent = '0';
            return;
        }
        
        let newCount = 0;
        if (container) container.innerHTML = '';
        
        Object.keys(requestsData).forEach(requestId => {
            const request = requestsData[requestId];
            
            if (!request.reviewed) {
                newCount++;
                
                const images = request.images || [];
                const firstImage = images.length > 0 ? images[0] : '';
                
                const requestHTML = `
                    <div class="bg-white p-4 rounded-lg border border-yellow-300 bg-yellow-50 mb-3">
                        <div class="flex justify-between items-start gap-4">
                            ${firstImage ? `
                                <div class="flex-shrink-0">
                                    <img src="${firstImage}" alt="وێنەی کالا" 
                                         class="w-20 h-20 object-cover rounded-lg cursor-pointer"
                                         onclick="openImageModal('${firstImage}')">
                                    ${images.length > 1 ? `<p class="text-xs text-blue-600 mt-1">${images.length} وێنە</p>` : ''}
                                </div>
                            ` : ''}
                            
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <strong class="text-base">${request.productName || 'ناونەزانراو'}</strong>
                                    <span class="bg-yellow-500 text-white text-xs px-2 py-1 rounded">نوێ</span>
                                </div>
                                <p class="text-sm text-gray-600"><strong>کڕیار:</strong> ${request.customerName || 'نادیار'}</p>
                                <p class="text-sm text-gray-600"><strong>ژمارە:</strong> ${request.customerPhone || 'نادیار'}</p>
                                <p class="text-sm text-gray-600"><strong>ناونیشان:</strong> ${request.customerAddress || 'نادیار'}</p>
                                <p class="text-sm text-gray-600"><strong>ژمارە:</strong> ${request.quantity || '1'}</p>
                                ${request.productDescription ? `<p class="text-sm text-gray-600"><strong>تێبینی:</strong> ${request.productDescription}</p>` : ''}
                                <p class="text-xs text-gray-500 mt-2">${new Date(request.timestamp || Date.now()).toLocaleString('ku')}</p>
                            </div>
                            
                            <div class="flex flex-col gap-2">
                                <button onclick="approveCustomerRequestNew('${requestId}')" 
                                        class="text-xs bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 whitespace-nowrap">
                                    ✓ پەسەندکردن
                                </button>
                                <button onclick="rejectRequest('${requestId}', 'customerRequests')" 
                                        class="text-xs bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 whitespace-nowrap">
                                    ✗ ڕەتکردنەوە
                                </button>
                                <button onclick="deleteRequest('${requestId}', 'customerRequests')" 
                                        class="text-xs bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 whitespace-nowrap">
                                    🗑 سڕینەوە
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                if (container) container.innerHTML += requestHTML;
            }
        });
        
        if (countElement) countElement.textContent = newCount;
        
        if (newCount === 0 && container) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ داواکارییەکی نوێ نیە</p>';
        }
        
    } catch (error) {
        console.error("Error loading customer requests:", error);
        const container = document.getElementById('customerRequestsList');
        if (container) {
            container.innerHTML = '<p class="text-red-500 text-center py-4">هەڵە لە بارکردنی داواکارییەکان</p>';
        }
    }
}

async function loadSellerProducts() {
    try {
        const productsRef = firebase.ref(firebase.db, 'sellerProducts');
        const snapshot = await firebase.get(productsRef);
        const productsData = snapshot.val();
        
        const container = document.getElementById('sellerProductsList');
        const countElement = document.getElementById('approvalNewSellerProductsCount');
        
        if (!productsData) {
            if (container) container.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ کالایەک نیە</p>';
            if (countElement) countElement.textContent = '0';
            return;
        }
        
        let newCount = 0;
        if (container) container.innerHTML = '';
        
        Object.keys(productsData).forEach(productId => {
            const product = productsData[productId];
            if (!product.reviewed) newCount++;
            
            const images = product.images || [];
            const firstImage = images.length > 0 ? images[0] : '' + PLACEHOLDER_IMAGE + '';
            
            const productHTML = `
                <div class="bg-white p-4 rounded-lg border ${product.reviewed ? 'border-gray-200' : 'border-yellow-300 bg-yellow-50'} mb-3">
                    <div class="flex gap-4">
                        <div class="flex-shrink-0">
                            <img src="${firstImage}" alt="${product.name || 'کالا'}" 
                                 class="w-24 h-24 object-cover rounded-lg cursor-pointer"
                                 onclick="openImageModal('${firstImage}')"
                                 onerror="this.src='' + PLACEHOLDER_IMAGE + ''">
                            ${images.length > 1 ? `<p class="text-xs text-blue-600 mt-1">${images.length} وێنە</p>` : ''}
                        </div>
                        
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <strong class="text-base">${product.name || 'ناونەزانراو'}</strong>
                                ${!product.reviewed ? '<span class="bg-yellow-500 text-white text-xs px-2 py-1 rounded">نوێ</span>' : ''}
                                ${product.status === 'approved' ? '<span class="bg-green-500 text-white text-xs px-2 py-1 rounded">پەسەندکراو</span>' : ''}
                                ${product.status === 'rejected' ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded">ڕەتکراوە</span>' : ''}
                            </div>
                            
                            ${product.sellerName ? `<p class="text-sm text-gray-600"><strong>فرۆشیار:</strong> ${product.sellerName}</p>` : ''}
                            ${product.sellerPhone ? `<p class="text-sm text-gray-600"><strong>ژمارە:</strong> ${product.sellerPhone}</p>` : ''}
                            <p class="text-sm text-gray-600"><strong>نرخ:</strong> ${product.price} ${product.currency === 'USD' ? '$' : 'دینار'}</p>
                            ${product.category ? `<p class="text-sm text-gray-600"><strong>جۆر:</strong> ${product.category}</p>` : ''}
                            ${product.description ? `<p class="text-sm text-gray-600"><strong>تێبینی:</strong> ${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</p>` : ''}
                            <p class="text-xs text-gray-500 mt-2">${new Date(product.createdAt).toLocaleString('ku')}</p>
                        </div>
                        
                        <div class="flex flex-col gap-2">
                            ${!product.reviewed ? `
                                <button onclick="approveSellerProductNew('${productId}')" 
                                        class="text-xs bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 whitespace-nowrap">
                                    ✓ پەسەندکردن
                                </button>
                                <button onclick="rejectSellerProduct('${productId}')" 
                                        class="text-xs bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 whitespace-nowrap">
                                    ✗ ڕەتکردنەوە
                                </button>
                            ` : ''}
                            <button onclick="deleteSellerProduct('${productId}')" 
                                    class="text-xs bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 whitespace-nowrap">
                                🗑 سڕینەوە
                            </button>
                        </div>
                    </div>
                </div>
            `;
            if (container) container.innerHTML += productHTML;
        });
        
        if (countElement) countElement.textContent = newCount;
        
    } catch (error) {
        console.error("Error loading seller products:", error);
    }
}

window.approveCustomerRequestNew = async function(requestId) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت ئەم داواکاری پەسەند بکەیت؟")) {
        return;
    }
    
    try {
        const requestRef = firebase.ref(firebase.db, 'customerRequests');
        const snapshot = await firebase.get(requestRef);
        const requests = snapshot.val();
        
        if (!requests || !requests[requestId]) {
            alert("داواکاری نەدۆزرایەوە!");
            return;
        }
        
        const request = requests[requestId];
        
        const copiedRequestsRef = firebase.ref(firebase.db, 'copiedCustomerRequests');
        const newRequestRef = firebase.push(copiedRequestsRef);
        
        const requestData = {
            customerName: request.customerName,
            customerPhone: request.customerPhone,
            customerAddress: request.customerAddress,
            productName: request.productName,
            productDescription: request.productDescription,
            quantity: request.quantity,
            images: request.images || [],
            timestamp: request.timestamp,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'admin',
            status: 'approved'
        };
        
        await firebase.set(newRequestRef, requestData);
        
        await firebase.update(firebase.ref(firebase.db, `customerRequests/${requestId}`), {
            reviewed: true,
            status: 'approved',
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'admin',
            approvedRequestId: newRequestRef.key
        });
        
        alert("✅ داواکاری پەسەندکرا و کۆپی کرا!");
        
        loadCustomerRequests();
        updateNotificationBadge();
        
        if (typeof currentMainTab !== 'undefined' && currentMainTab === 'customer') {
            loadAndShowCopiedCustomerRequests();
        }
        
    } catch (error) {
        console.error("Error approving customer request:", error);
        alert("❌ هەڵە لە پەسەندکردنی داواکاری: " + error.message);
    }
};

window.approveSellerProductNew = async function(productId) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت ئەم کالا پەسەند بکەیت؟")) {
        return;
    }
    
    try {
        const productRef = firebase.ref(firebase.db, `sellerProducts/${productId}`);
        const snapshot = await firebase.get(productRef);
        const product = snapshot.val();
        
        if (!product) {
            alert("کالا نەدۆزرایەوە!");
            return;
        }
        
        const copiedProductsRef = firebase.ref(firebase.db, 'copiedSellerProducts');
        const newProductRef = firebase.push(copiedProductsRef);
        
        const productData = {
            name: product.name || 'ناونەزانراو',
            price: product.price || '0',
            priceUSD: product.priceUSD || (product.currency === 'USD' ? product.price : (parseFloat(product.price) / 1450).toFixed(2)),
            category: product.category || 'کالای فرۆشیار',
            description: product.description || '',
            images: product.images || [],
            imageUrl: product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : ''),
            sellerName: product.sellerName || '',
            sellerPhone: product.sellerPhone || '',
            sellerAddress: product.sellerAddress || '',
            originalPrice: product.originalPrice || '',
            discount: product.discount || '',
            quantity: product.quantity || 1,
            currency: product.currency || 'IQD',
            createdAt: product.createdAt || new Date().toISOString(),
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'admin',
            status: 'approved'
        };
        
        await firebase.set(newProductRef, productData);
        
        await firebase.update(productRef, {
            reviewed: true,
            status: 'approved',
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'admin',
            approvedProductId: newProductRef.key
        });
        
        alert("✅ کالا پەسەندکرا و کۆپی کرا!");
        
        loadSellerProducts();
        updateNotificationBadge();
        
        if (typeof currentMainTab !== 'undefined' && currentMainTab === 'seller') {
            loadAndShowCopiedSellerProducts();
        }
        
    } catch (error) {
        console.error("Error approving seller product:", error);
        alert("❌ هەڵە لە پەسەندکردنی کالا: " + error.message);
    }
};

window.rejectRequest = async function(requestId, type) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت ڕەت بکەیتەوە؟")) {
        return;
    }
    
    try {
        const requestRef = firebase.ref(firebase.db, `${type}/${requestId}`);
        await firebase.update(requestRef, {
            reviewed: true,
            status: 'rejected',
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'admin'
        });
        
        alert("✅ ڕەتکرایەوە!");
        loadCustomerRequests();
        updateNotificationBadge();
    } catch (error) {
        console.error("Error rejecting request:", error);
        alert("❌ هەڵە لە ڕەتکردنەوە!");
    }
};

window.deleteRequest = async function(requestId, type) {
    console.log("🔍 deleteRequest called:", { requestId, type, isAdminLoggedIn });
    
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت بسڕیتەوە؟")) {
        return;
    }
    
    try {
        const requestRef = firebase.ref(firebase.db, `${type}/${requestId}`);
        const snapshot = await firebase.get(requestRef);
        const request = snapshot.val();
        
        // 🗑️ سڕینەوەی وێنەکان لە Storage
        if (request && request.images && Array.isArray(request.images)) {
            console.log(`🖼️ Deleting ${request.images.length} images from storage...`);
            for (const imageUrl of request.images) {
                try {
                    const imagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
                    const imageRef = firebase.storageRef(firebase.storage, imagePath);
                    await firebase.deleteObject(imageRef);
                    console.log("✅ Image deleted:", imagePath);
                } catch (storageError) {
                    console.warn("⚠️ نەتوانرا وێنە بسڕدرێتەوە:", storageError);
                }
            }
        }
        
        // 🗑️ سڕینەوە لە customerRequests
        await firebase.remove(requestRef);
        
        // 🗑️ سڕینەوە لە copiedCustomerRequests (ئەگەر پەسەندکرابوو)
        if (request && request.status === 'approved') {
            const copiedRef = firebase.ref(firebase.db, `copiedCustomerRequests/${requestId}`);
            const copiedSnapshot = await firebase.get(copiedRef);
            if (copiedSnapshot.exists()) {
                await firebase.remove(copiedRef);
                console.log("✅ Removed from copiedCustomerRequests too");
            }
        }
        
        alert("✅ داواکاری و هەموو وێنەکانی سڕدرانەوە!");
        loadCustomerRequests();
        updateNotificationBadge();
    } catch (error) {
        console.error("Error deleting request:", error);
        alert("❌ هەڵە لە سڕینەوە!");
    }
};

window.rejectSellerProduct = async function(productId) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت ڕەت بکەیتەوە؟")) {
        return;
    }
    
    try {
        const productRef = firebase.ref(firebase.db, `sellerProducts/${productId}`);
        await firebase.update(productRef, {
            reviewed: true,
            status: 'rejected',
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'admin'
        });
        
        alert("✅ کالا ڕەتکرایەوە!");
        loadSellerProducts();
        updateNotificationBadge();
        
    } catch (error) {
        console.error("Error rejecting seller product:", error);
        alert("❌ هەڵە لە ڕەتکردنەوە!");
    }
};

window.deleteSellerProduct = async function(productId) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت بسڕیتەوە؟")) {
        return;
    }
    
    try {
        const productRef = firebase.ref(firebase.db, `sellerProducts/${productId}`);
        const snapshot = await firebase.get(productRef);
        const product = snapshot.val();
        
        // 🗑️ سڕینەوەی وێنەکان لە Storage
        if (product && product.images && Array.isArray(product.images)) {
            console.log(`🖼️ Deleting ${product.images.length} images from storage...`);
            for (const imageUrl of product.images) {
                try {
                    const imagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
                    const imageRef = firebase.storageRef(firebase.storage, imagePath);
                    await firebase.deleteObject(imageRef);
                    console.log("✅ Image deleted:", imagePath);
                } catch (storageError) {
                    console.warn("⚠️ نەتوانرا وێنە بسڕدرێتەوە:", storageError);
                }
            }
        }
        
        // 🗑️ سڕینەوە لە sellerProducts
        await firebase.remove(productRef);
        
        // 🗑️ سڕینەوە لە copiedSellerProducts (ئەگەر پەسەندکرابوو)
        if (product && product.status === 'approved') {
            const copiedRef = firebase.ref(firebase.db, `copiedSellerProducts/${productId}`);
            const copiedSnapshot = await firebase.get(copiedRef);
            if (copiedSnapshot.exists()) {
                await firebase.remove(copiedRef);
                console.log("✅ Removed from copiedSellerProducts too");
            }
        }
        
        alert("✅ کالا و هەموو وێنەکانی سڕدرانەوە!");
        loadSellerProducts();
        updateNotificationBadge();
        
    } catch (error) {
        console.error("Error deleting seller product:", error);
        alert("❌ هەڵە لە سڕینەوە!");
    }
};

// فەنکشنەکانی نوێکردنەوەی داشبۆرد
async function updateAdminDashboard() {
    try {
        let totalProducts = 0;
        let newOrdersCount = 0;
        let newSellerProductsCount = 0;
        let newCustomerRequestsCount = 0;
        
        if (globalProductsData) {
            totalProducts = Object.keys(globalProductsData).length;
        }
        
        const requestsRef = firebase.ref(firebase.db, 'customerRequests');
        const requestsSnapshot = await firebase.get(requestsRef);
        const requestsData = requestsSnapshot.val();
        
        if (requestsData) {
            Object.values(requestsData).forEach(request => {
                if (!request.reviewed) {
                    newCustomerRequestsCount++;
                    newOrdersCount++;
                }
            });
        }
        
        const sellerRef = firebase.ref(firebase.db, 'sellerProducts');
        const sellerSnapshot = await firebase.get(sellerRef);
        const sellerData = sellerSnapshot.val();
        
        if (sellerData) {
            Object.values(sellerData).forEach(product => {
                if (!product.reviewed) {
                    newSellerProductsCount++;
                    newOrdersCount++;
                }
            });
        }
        
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('newOrdersCount').textContent = newOrdersCount;
        document.getElementById('newSellerProductsCount').textContent = newSellerProductsCount;
        document.getElementById('newCustomerRequestsCount').textContent = newCustomerRequestsCount;
        
        document.getElementById('sellerProductsBadge').textContent = newSellerProductsCount;
        document.getElementById('customerRequestsBadge').textContent = newCustomerRequestsCount;
        
        if (newSellerProductsCount > 0) {
            document.getElementById('sellerProductsBadge').style.display = 'inline-block';
        } else {
            document.getElementById('sellerProductsBadge').style.display = 'none';
        }
        
        if (newCustomerRequestsCount > 0) {
            document.getElementById('customerRequestsBadge').style.display = 'inline-block';
        } else {
            document.getElementById('customerRequestsBadge').style.display = 'none';
        }
        
    } catch (error) {
        console.error("Error updating admin dashboard:", error);
    }
}

async function updateNotificationBadge() {
    try {
        let totalNotifications = 0;
        
        const requestsRef = firebase.ref(firebase.db, 'customerRequests');
        const requestsSnapshot = await firebase.get(requestsRef);
        const requestsData = requestsSnapshot.val();
        
        if (requestsData) {
            Object.values(requestsData).forEach(request => {
                if (!request.reviewed) totalNotifications++;
            });
        }
        
        const sellerRef = firebase.ref(firebase.db, 'sellerProducts');
        const sellerSnapshot = await firebase.get(sellerRef);
        const sellerData = sellerSnapshot.val();
        
        if (sellerData) {
            Object.values(sellerData).forEach(product => {
                if (!product.reviewed) totalNotifications++;
            });
        }
        
        const badge = document.getElementById('notificationBadge');
        const approvalBadge = document.getElementById('approvalBadge');
        
        if (totalNotifications > 0) {
            if (badge) {
                badge.textContent = totalNotifications;
                badge.style.display = 'flex';
            }
            if (approvalBadge) {
                approvalBadge.textContent = totalNotifications;
                approvalBadge.style.display = 'inline-block';
            }
        } else {
            if (badge) badge.style.display = 'none';
            if (approvalBadge) approvalBadge.style.display = 'none';
        }
        
    } catch (error) {
        console.error("Error updating notification badge:", error);
    }
}

// فەنکشنەکانی پێداچوونەوەی کالاکان
window.showProductDetails = function(productId) {
    const modal = document.getElementById('productDetailsModal');
    const contentDiv = document.getElementById('productDetailsContent');
    const product = globalProductsData ? globalProductsData[productId] : null;
    
    if (!modal || !contentDiv || !product) return;

    const images = product.images || (product.imageUrl ? [product.imageUrl] : []);
    const firstImage = images[0] || '' + PLACEHOLDER_IMAGE + '';
    const hasDiscount = product.originalPrice && product.discount;
    const discountPercentage = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

    const whatsappMessage = encodeURIComponent(` 😊\n\n🛍 زانیاری کاڵا:\n📌 ناوی کاڵا: ${product.name}\n📂 جۆر: ${product.category || 'نادیار'}\n${product.availableColors ? `🎨 رەنگەکان: ${product.availableColors}\n` : ''}${product.availableQuantity ? `📦 ژمارە: ${product.availableQuantity} دانە\n` : ''}\n🖼️ وێنە: ${firstImage}`);

    contentDiv.innerHTML = `
        <div class="flex flex-col h-full text-right bg-white" dir="rtl" style="overflow-y: auto;">
            
            <!-- 🔹 بەشی ١: وێنەی سەرەمی -->
            <div class="relative w-full bg-gray-100 rounded-lg overflow-hidden shadow-sm border border-gray-100 mb-2" style="height: 180px; flex-shrink: 0;">
                <img id="mainProductImage" 
                     src="${firstImage}" 
                     class="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
                     style="transition: opacity 0.3s ease;"
                     onclick="expandImage('${firstImage}')"
                     alt="${product.name}">
                
                <!-- دوگمەی داخستن -->
                <button onclick="closeModal()" class="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 hover:text-red-600 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- 🔹 بەشی ٢: وێنە بچووکەکان -->
            ${images.length >= 1 ? `
                <div class="flex gap-1.5 items-center overflow-x-auto pb-1 mb-2 px-1" style="scrollbar-width: thin; flex-shrink: 0;">
                    ${images.map((img, idx) => `<img src="${img}" class="thumbnail-img w-12 h-12 object-cover rounded-md cursor-pointer border-2 transition-all ${idx === 0 ? 'border-blue-500 scale-105' : 'border-gray-200 hover:border-blue-300'}" onclick="changeMainImage('${img}', ${idx})" data-index="${idx}" alt="وێنەی ${idx + 1}">`).join('')}
                    
                    <!-- ژمارەی وێنەکان تەنها -->
                    <div class="bg-black/60 backdrop-blur text-white px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                        <span id="currentImageIndex">1</span> / ${images.length}
                    </div>
                </div>
            ` : ''}

            <!-- 🔹 بەشی ٣: زانیارییەکانی کاڵا -->
            <div class="px-3 space-y-2.5 overflow-y-auto" style="max-height: 350px;">
                <div>
                   <span class="inline-block bg-[#39C7F7]/20 text-[#39C7F7] px-2 py-0.5 rounded-md text-xs font-bold">
                        ${product.category || 'نادیار'}
                    </span>
                </div>
                
                <!-- بۆکسی زانیاری بەردەستبوون سڕایەوە - تەنها دوای پشکنین پیشان دەدرێت -->
                                   
                <!-- پشکنینی بەردەستی رەنگ و ژمارە -->
                <div class="bg-white rounded-lg p-3 shadow-sm border border-gray-200 mb-2">
                    <h4 class="font-bold text-gray-800 mb-2 text-sm">پشکنینی بەردەستی</h4>
                    
                    <!-- رەنگەکانی بەردەست -->
                    <div class="mb-2">
                        <label class="block text-gray-700 text-xs font-medium mb-2">ڕەنگ و شێوازە بەردەستەکان</label>
                        <div id="availableColorsDisplay" class="flex flex-wrap gap-2">
                            <!-- رەنگەکان لێرە داینامیکی زیاد دەکرێن -->
                        </div>
                    </div>
                    
                    <!-- ژمارەی داواکراو و دوگمەی پشکنیین -->
                    <div class="flex gap-2 items-center mb-2">
                        <input type="number" 
                               id="modalQuantityInput" 
                               class="flex-1 p-2 border-2 border-gray-300 rounded-lg text-right text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-9" 
                               placeholder="ژمارە بنووسە..." 
                               min="1" 
                               value="">
                        <button type="button"
                                onclick="checkProductAvailabilityInModal('${productId}')"
                                class="bg-[#39C7F7] hover:bg-[#2fb6e4] text-white px-4 py-2 rounded-lg text-xs font-bold h-9 whitespace-nowrap transition-all">
                            پشکنیین
                        </button>
                    </div>
                    
                    <!-- ئەنجامی پشکنین -->
                    <div>
                        <div id="modalAvailabilityResult" class="text-xs h-9 flex items-center justify-center bg-gray-50 rounded-lg"></div>
                    </div>
                    
                    <input type="hidden" id="modalColorInput" value="">
                </div>

                <!-- دوگمەکان -->
                <div class="grid grid-cols-1 gap-2 mt-2">
            <!-- دوگمەی واتساپ -->
<a href="https://wa.me/9647701922060?text=${encodeURIComponent(product.images && product.images[0] ? product.images[0] : 'هیچ وێنەیەک نییە')}" 
   target="_blank" 
   class="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-all text-xs flex items-center justify-center gap-1">
    <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333 .157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411"/>
    </svg>
    پەیوەندی کردن لە ڕێگەی واتسئاپ
</a>
            </div>
        </div>
    `;
    
    // 🔹 داخستنی مۆدالی "جۆری کاڵاکان" ئەگەر کراوە بێت
    const ordersPageModal = document.getElementById('ordersPage');
    if (ordersPageModal && ordersPageModal.style.display === 'flex') {
        ordersPageModal.style.display = 'none';
    }
    
    modal.style.display = 'flex';
    modal.classList.remove('opacity-0', 'scale-95');
    modal.classList.add('opacity-100', 'scale-100');
    
    // پیشاندانی رەنگەکانی بەردەست
    displayAvailableColors(product, productId);
};

window.changeMainImage = function(imageSrc, index) {
    const mainImg = document.getElementById('mainProductImage');
    const thumbnails = document.querySelectorAll('.thumbnail-img');
    const currentIndex = document.getElementById('currentImageIndex');
    
    if (mainImg) {
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.src = imageSrc;
            mainImg.style.opacity = '1';
        }, 150);
    }
    
    if (currentIndex) {
        currentIndex.textContent = index + 1;
    }
    
    thumbnails.forEach((thumb, idx) => {
        thumb.classList.remove('border-blue-500', 'scale-105');
        thumb.classList.add('border-gray-200');
        if (idx === index) {
            thumb.classList.remove('border-gray-200');
            thumb.classList.add('border-blue-500', 'scale-105');
        }
    });
};

window.expandImage = function(imageSrc) {
    const expandModal = document.createElement('div');
    expandModal.id = 'expandImageModal';
    expandModal.className = 'fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-4';
    expandModal.innerHTML = `
        <button onclick="closeExpandImage()" class="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
        <img src="${imageSrc}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="وێنەی فراوان">
    `;
    document.body.appendChild(expandModal);
    
    expandModal.addEventListener('click', function(e) {
        if (e.target === expandModal) closeExpandImage();
    });
};

window.closeExpandImage = function() {
    const expandModal = document.getElementById('expandImageModal');
    if (expandModal) expandModal.remove();
};

window.closeModal = function() {
    const modal = document.getElementById('productDetailsModal');
    if (modal) {
        modal.classList.remove('opacity-100', 'scale-100');
        modal.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            modal.style.display = 'none';
            
            // 🔹 دووبارە کردنەوەی مۆدالی "جۆری کاڵاکان" ئەگەر لە bottom nav active بوو
            const ordersBtn = document.getElementById('bottomOrdersBtn');
            if (ordersBtn && ordersBtn.classList.contains('active')) {
                const ordersPageModal = document.getElementById('ordersPage');
                if (ordersPageModal) {
                    ordersPageModal.style.display = 'flex';
                }
            }
        }, 300);
    }
};

window.checkProductAvailabilityInModal = function(productId) {
    const product = globalProductsData ? globalProductsData[productId] : null;
    if (!product) return;
    
    const colorInput = document.getElementById('modalColorInput');
    const quantityInput = document.getElementById('modalQuantityInput');
    const resultDiv = document.getElementById('modalAvailabilityResult');
    
    if (!colorInput || !resultDiv) return;
    
    const requestedColor = colorInput.value.trim();
    const requestedQuantity = parseInt(quantityInput.value) || 0;
    
    if (!requestedColor) {
        resultDiv.innerHTML = `<span class="text-yellow-600 font-medium text-xs">تکایە یەک رەنگ هەڵبژێرە!</span>`;
        return;
    }
    
    if (!requestedQuantity || requestedQuantity < 1) {
        resultDiv.innerHTML = `<span class="text-yellow-600 font-medium text-xs">تکایە ژمارەیەک بنووسە!</span>`;
        return;
    }
    
    resultDiv.innerHTML = '<span class="text-gray-600 text-xs">پشکنین...</span>';
    
    setTimeout(() => {
        // پشکنینی بەردەستبوونی رەنگ
        if (product.colorQuantity && product.colorQuantity[requestedColor] !== undefined) {
            const availableQuantity = product.colorQuantity[requestedColor];
            
            if (availableQuantity === 0 || availableQuantity < requestedQuantity) {
                // بەردەست نیە یان ژمارەی داواکراو زیاتره لە ئەوەی هەیە
                resultDiv.innerHTML = `
                    <div style="background: #e0f2fe; border-radius: 10px; padding: 6px 14px; width:100%; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <span style="font-size:15px;">❌</span>
                        <span style="color:#1e40af; font-weight:700; font-size:13px; white-space:nowrap;">بەردەست نیە</span>
                    </div>
                `;
            } else {
                // ژمارەی داواکراو بەردەستە
                resultDiv.innerHTML = `
                    <div style="background: #e0f2fe; border-radius: 10px; padding: 6px 14px; width:100%; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <span style="font-size:15px;">✅</span>
                        <span style="color:#1e40af; font-weight:700; font-size:13px; white-space:nowrap;">بەردەستە</span>
                    </div>
                `;
            }
        } else {
            resultDiv.innerHTML = `
                <div style="background: #e0f2fe; border-radius: 10px; padding: 6px 14px; width:100%; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <span style="font-size:15px;">❌</span>
                    <span style="color:#1e40af; font-weight:700; font-size:13px; white-space:nowrap;">بەردەست نیە</span>
                </div>
            `;
        }
    }, 500);
};

// فەنکشنی نوێ بۆ پیشاندانی رەنگەکان
window.displayAvailableColors = function(product, productId) {
    const colorsContainer = document.getElementById('availableColorsDisplay');
    if (!colorsContainer) {
        console.warn('availableColorsDisplay container not found!');
        return;
    }
    
    if (!product.colorQuantity || Object.keys(product.colorQuantity).length === 0) {
        colorsContainer.innerHTML = `<span class="text-gray-500 text-xs">هیچ رەنگێک بەردەست نیە</span>`;
        // سڕینەوەی نیشاندانی بەردەستی ئەگەر رەنگ نەبێت
        const resultDiv = document.getElementById('modalAvailabilityResult');
        if (resultDiv) {
            resultDiv.innerHTML = '';
        }
        return;
    }
    
    colorsContainer.innerHTML = '';
    
    Object.entries(product.colorQuantity).forEach(([color, quantity]) => {
        // دەرکەوتنی ئایا رەنگەکە hex code یە یان ناو
        const isHexColor = color.startsWith('#');
        
        const colorBtn = document.createElement('button');
        colorBtn.type = 'button';
        colorBtn.className = 'color-option-btn';
        colorBtn.setAttribute('data-quantity', quantity);
        colorBtn.setAttribute('data-color', color);
        
        // زیادکردنی event listener بۆ کلیک
        colorBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectColor(color, productId, quantity, colorBtn);
        });
        
        if (isHexColor) {
            // ئەگەر hex code بێت، تەنها رەنگ پیشان بدە بەبێ ژمارە
            colorBtn.innerHTML = `
                <div class="flex items-center gap-2 px-3 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-all cursor-pointer" style="min-width: 44px;">
                    <div style="width: 32px; height: 32px; background-color: ${color}; border: 1px solid #ddd; border-radius: 6px; flex-shrink: 0;"></div>
                </div>
            `;
        } else {
            // ئەگەر ناوی رەنگ بێت، تەنها ناو پیشان بدە بەبێ ژمارە
            colorBtn.innerHTML = `
                <div class="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-all cursor-pointer">
                    <span class="text-sm font-bold">${color}</span>
                </div>
            `;
        }
        
        colorsContainer.appendChild(colorBtn);
    });
    
    console.log('Colors displayed successfully:', Object.keys(product.colorQuantity).length);
};

// فەنکشنی هەڵبژاردنی رەنگ
window.selectColor = function(color, productId, quantity, clickedButton) {
    const colorInput = document.getElementById('modalColorInput');
    if (colorInput) {
        colorInput.value = color;
    }
    
    // دەستنیشانکردنی دوگمەی هەڵبژێردراو - پشکنینی ئەگەر div هەبێت
    const allColorBtns = document.querySelectorAll('.color-option-btn div');
    allColorBtns.forEach(btn => {
        // سڕینەوەی کلاسە کۆنەکان و زیادکردنی کلاسی بنەڕەتی
        btn.classList.remove('border-blue-500', 'bg-blue-50');
        if (!btn.classList.contains('border-2')) {
            btn.classList.add('border-2');
        }
        if (!btn.classList.contains('border-gray-300')) {
            btn.classList.add('border-gray-300');
        }
    });
    
    // نیشانکردنی دوگمەی هەڵبژێردراو
    if (clickedButton) {
        const innerDiv = clickedButton.querySelector('div');
        if (innerDiv) {
            innerDiv.classList.remove('border-gray-300');
            innerDiv.classList.add('border-blue-500', 'bg-blue-50');
        }
    }
    
    // پاككردنەوەی ئەنجامی پشکنینی پێشو - کریار دەبێت ژمارە بنووسێت و دوگمەی پشکنیین بکاتەوە
    const resultDiv = document.getElementById('modalAvailabilityResult');
    if (resultDiv) {
        resultDiv.innerHTML = '';
    }
    
    console.log(`Color selected: ${color}, Quantity: ${quantity}`);
};

// فەنکشنەکانی بەڕێوەبردنی رەنگ و ژمارە
// فەنکشنی نوێ بۆ زیادکردنی رەنگ بە هەردوو شێواز (dropdown + custom input)
window.addColorRowNew = function() {
    const container = document.getElementById('colorQuantityContainer');
    const colorDropdown = document.getElementById('colorDropdown');
    const customInput = document.getElementById('colorCustomInput');
    
    // وەرگرتنی رەنگی هەڵبژێردراو یان نووسراو
    let selectedColor = '';
    
    if (customInput && customInput.value.trim() !== '') {
        // ئەگەر رەنگ بە شێوازی تێکست نووسرابێت
        selectedColor = customInput.value.trim();
        customInput.value = ''; // پاککردنەوەی خانەکە
    } else if (colorDropdown && colorDropdown.value !== '') {
        // ئەگەر رەنگ لە دراپ داون هەڵبژێردرابێت
        selectedColor = colorDropdown.value;
        colorDropdown.value = ''; // پاککردنەوەی هەڵبژاردن
    } else {
        alert("تکایە رەنگێک هەڵبژێرە یان بنووسە!");
        return;
    }
    
    // دروستکردنی ڕیزێکی نوێ
    const newRow = document.createElement('div');
    newRow.className = 'color-quantity-row';
    newRow.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px;';
    newRow.innerHTML = `
        <input type="text" class="color-input" value="${selectedColor}" readonly
               style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb;">
        <input type="number" class="quantity-input" placeholder="ژمارە" min="0" value="1"
               style="width: 100px; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
        <button type="button" onclick="removeColorRow(this)" 
                style="background: #ef4444; color: white; padding: 10px; border-radius: 8px; border: none; cursor: pointer;">
            ×
        </button>
    `;
    container.appendChild(newRow);
};

// فەنکشنی کۆن بۆ پاشەکەوت کردن (بۆ ئەگەر هەر شوێنێک بەکاری بهێنێت)
window.addColorRow = function() {
    const container = document.getElementById('colorQuantityContainer');
    const newRow = document.createElement('div');
    newRow.className = 'color-quantity-row';
    newRow.style.cssText = 'display: flex; gap: 8px; align-items: center;';
    newRow.innerHTML = `
        <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
            <input type="color" class="color-picker" 
                   style="width: 50px; height: 42px; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer;">
            <input type="text" class="color-name" placeholder="ناوی رەنگ (ئارەزوومەندانە)" 
                   style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
        </div>
        <input type="number" class="quantity-input" placeholder="ژمارە" min="0" 
               style="width: 100px; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
        <button type="button" onclick="removeColorRow(this)" 
                style="background: #ef4444; color: white; padding: 10px; border-radius: 8px; border: none; cursor: pointer;">
            ×
        </button>
    `;
    container.appendChild(newRow);
};

window.removeColorRow = function(button) {
    const container = document.getElementById('colorQuantityContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    } else {
        alert('لانیکەم یەک رەنگ پێویستە!');
    }
};

window.getColorQuantityData = function() {
    const rows = document.querySelectorAll('.color-quantity-row');
    const colorQuantity = {};
    
    rows.forEach(row => {
        // پشکنینی جۆری row (کۆن یان نوێ)
        const colorInput = row.querySelector('.color-input'); // بۆ سیستەمی نوێ
        const colorPicker = row.querySelector('.color-picker'); // بۆ سیستەمی کۆن
        const colorName = row.querySelector('.color-name'); // بۆ سیستەمی کۆن
        const quantity = row.querySelector('.quantity-input');
        
        let colorKey = '';
        
        if (colorInput) {
            // سیستەمی نوێ - رەنگ لە input ـی readonly دێت
            colorKey = colorInput.value.trim();
        } else if (colorPicker) {
            // سیستەمی کۆن - رەنگ لە color picker یان ناوی رەنگەوە دێت
            colorKey = colorName && colorName.value.trim() 
                ? colorName.value.trim() 
                : colorPicker.value;
        }
        
        if (colorKey && quantity && quantity.value) {
            const cleanedColor = colorKey.trim().replace(/\s+/g, ' ');
            const quantityValue = parseInt(quantity.value);
            
            // کۆکردنەوەی رەنگە هاوشێوەکان
            const existingKey = Object.keys(colorQuantity).find(key => 
                key.toLowerCase() === cleanedColor.toLowerCase()
            );
            
            if (existingKey) {
                colorQuantity[existingKey] += quantityValue;
            } else {
                colorQuantity[cleanedColor] = quantityValue;
            }
        }
    });
    
    return colorQuantity;
};

// فەنکشنەکانی وێنە
window.openImageModal = function(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    
    if (!modal || !modalImage) return;
    
    modalImage.src = imageSrc;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeImageModal = function() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
};

window.openImageZoom = function(firstImage, images, startIndex) {
    zoomImages = images;
    currentZoomIndex = startIndex;
    
    const modal = document.getElementById('imageZoomModal');
    const zoomedImage = document.getElementById('zoomedImage');
    const counter = document.getElementById('zoomImageCounter');
    
    if (!modal || !zoomedImage || !counter) return;
    
    zoomedImage.src = zoomImages[currentZoomIndex];
    counter.textContent = `${currentZoomIndex + 1}/${zoomImages.length}`;
    
    modal.classList.add('active');
};

window.closeImageZoom = function() {
    const modal = document.getElementById('imageZoomModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

window.changeZoomImage = function(direction) {
    currentZoomIndex += direction;
    
    if (currentZoomIndex < 0) {
        currentZoomIndex = zoomImages.length - 1;
    } else if (currentZoomIndex >= zoomImages.length) {
        currentZoomIndex = 0;
    }
    
    const zoomedImage = document.getElementById('zoomedImage');
    const counter = document.getElementById('zoomImageCounter');
    
    if (zoomedImage) {
        zoomedImage.src = zoomImages[currentZoomIndex];
    }
    if (counter) {
        counter.textContent = `${currentZoomIndex + 1}/${zoomImages.length}`;
    }
};



// --- فەنکشنەکانی بەشی پەیوەندی و خزمەتگوزارییەکان ---

// 1. کردنەوەی مۆداڵی ژمارە تەلەفۆنەکان
window.openContact = function() {
    const modal = document.getElementById('phoneModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

// 2. کردنەوەی نرخنامە
window.openPricing = function() {
    const withPriceUrl = "https://drive.google.com/file/d/1oKTUGbKy1ivYps1HRZZK6k4rbhb-hFgc/preview";
    window.open(withPriceUrl, '_blank');
};

// 3. کردنەوەی کاتالۆگ
window.openCatalog = function() {
    const catalogUrl = "https://drive.google.com/file/d/1ctwhTLfIlaz3l_wJq3DO6XGXDs43L3bQ/preview";
    window.open(catalogUrl, '_blank');
};

// 4. کردنەوەی لۆکەیشن (بە لینکی نوێ)
window.openLocation = function() {
    const googleMapsUrl = "https://www.google.com/maps/place/PromoHouse/@35.5863915,45.4040764,17z/data=!3m1!4b1!4m6!3m5!1s0x40002d43b52a1ec5:0x4e15bca6a560211!8m2!3d35.5863915!4d45.4066513!16s%2Fg%2F11mrwjfxtf?entry=ttu&g_ep=EgoyMDI2MDIwNC4wIKXMDSoKLDEwMDc5MjA2OUgBUAM%3D"; 
    window.open(googleMapsUrl, '_blank');
};
// فەنکشنەکانی گەڕانەوە
window.backToHomeFromRequestForm = function() {
    document.getElementById('requestFormSection').style.display = 'none';
    showHomePage();
};

window.backToHomeFromSellerForm = function() {
    document.getElementById('sellerProductFormSection').style.display = 'none';
    showHomePage();
};

window.backToCopiedFromEdit = function() {
    document.getElementById('editSellerProductFormSection').style.display = 'none';
    document.getElementById('editCustomerRequestFormSection').style.display = 'none';
    showCopiedProductsSection();
};

// فەنکشنەکانی یارمەتیدەر
function updateBottomNavActive(activeBtnId) {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.id !== 'loginModal' && modal.id !== 'adminPanelModal' && 
            modal.id !== 'phoneModal' && modal.id !== 'fibModal') {
            modal.style.display = 'none';
        }
    });
}

// فەنکشنەکانی Firebase فۆرمەکان
async function submitCustomerRequest(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitRequestText');
    const spinner = document.getElementById('submitRequestSpinner');
    
    submitBtn.textContent = 'ناردن...';
    spinner.style.display = 'inline-block';
    
    try {
        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const customerAddress = document.getElementById('customerAddress').value;
        const requestProduct = document.getElementById('requestProduct').value;
        const requestDescription = document.getElementById('requestDescription').value;
        const requestQuantity = document.getElementById('requestQuantity').value;
        
        const imageFiles = document.getElementById('customerProductImages').files;
        let imageUrls = [];
        
        if (imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const storagePath = `customerRequests/${Date.now()}_${file.name}`;
                const storageReference = firebase.storageRef(firebase.storage, storagePath);
                
                await firebase.uploadBytes(storageReference, file);
                const downloadURL = await firebase.getDownloadURL(storageReference);
                imageUrls.push(downloadURL);
            }
        }
        
        const requestData = {
            customerName,
            customerPhone,
            customerAddress,
            productName: requestProduct,
            productDescription: requestDescription,
            quantity: parseInt(requestQuantity),
            images: imageUrls,
            timestamp: new Date().toISOString(),
            reviewed: false,
            status: 'pending'
        };
        
        const requestsRef = firebase.ref(firebase.db, 'customerRequests');
        const newRequestRef = firebase.push(requestsRef);
        await firebase.set(newRequestRef, requestData);
        
        alert("✅ داواکاریەکەت بە سەرکەوتوویی نێردرا!");
        document.getElementById('customerRequestForm').reset();
        document.getElementById('customerImagePreviewContainer').innerHTML = '';
        document.getElementById('customerFileName').textContent = '';
        
        showHomePage();
        
    } catch (error) {
        console.error("Error submitting customer request:", error);
        alert("❌ هەڵە لە ناردنی داواکاری: " + error.message);
    } finally {
        submitBtn.textContent = 'ناردنی داواکاری';
        spinner.style.display = 'none';
    }
}

async function submitSellerProduct(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitSellerProductText');
    const spinner = document.getElementById('submitSellerProductSpinner');
    
    submitBtn.textContent = 'ناردن...';
    spinner.style.display = 'inline-block';
    
    try {
        const sellerName = document.getElementById('sellerProductName').value;
        const sellerPhone = document.getElementById('sellerPhone').value;
        const sellerAddress = document.getElementById('sellerAddress').value;
        const productTitle = document.getElementById('sellerProductTitle').value;
        const productDescription = document.getElementById('sellerProductDescription').value;
        const productQuantity = document.getElementById('sellerProductQuantity').value;
        const productPrice = document.getElementById('sellerProductPrice').value;
        const productCurrency = 'USD'; // هەمیشە دۆلار چونکە خانەی هەڵبژاردن نەماوە
        
        const imageFiles = document.getElementById('sellerProductImages').files;
        let imageUrls = [];
        
        if (imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const storagePath = `sellerProducts/${Date.now()}_${file.name}`;
                const storageReference = firebase.storageRef(firebase.storage, storagePath);
                
                await firebase.uploadBytes(storageReference, file);
                const downloadURL = await firebase.getDownloadURL(storageReference);
                imageUrls.push(downloadURL);
            }
        }
        
        const productData = {
            name: productTitle,
            sellerName,
            sellerPhone,
            sellerAddress,
            description: productDescription,
            quantity: parseInt(productQuantity),
            price: parseFloat(productPrice),
            currency: productCurrency,
            images: imageUrls,
            createdAt: new Date().toISOString(),
            reviewed: false,
            status: 'pending'
        };
        
        const productsRef = firebase.ref(firebase.db, 'sellerProducts');
        const newProductRef = firebase.push(productsRef);
        await firebase.set(newProductRef, productData);
        
        alert("✅ کالاکەت بە سەرکەوتوویی نێردرا!");
        document.getElementById('sellerProductForm').reset();
        document.getElementById('sellerImagePreviewContainer').innerHTML = '';
        document.getElementById('sellerFileName').textContent = '';
        
        showHomePage();
        
    } catch (error) {
        console.error("Error submitting seller product:", error);
        alert("❌ هەڵە لە ناردنی کالا: " + error.message);
    } finally {
        submitBtn.textContent = 'ناردنی داواکاری';
        spinner.style.display = 'none';
    }
}

async function submitProductForm(event) {
    event.preventDefault();
    
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('submitSpinner');
    const submitText = document.getElementById('submitText');
    
    submitText.textContent = 'ناردن...';
    spinner.style.display = 'inline-block';
    
    try {
        const productId = document.getElementById('productId').value;
        const productName = document.getElementById('productName').value;
        const productPriceUSD = document.getElementById('productPriceUSD').value;
        const productPrice = parseFloat(productPriceUSD) * 1450; // حسابکردنی نرخی دینار لە دۆڵارەوە
        const productCategory = document.getElementById('productCategory').value;
        
        // کۆکردنەوەی رەنگ و ژمارەکان
        const colorQuantityData = getColorQuantityData();
        
        const imageFiles = document.getElementById('productImages').files;
        let imageUrls = [];
        
        if (imageFiles.length > 0) {
            // وێنەی نوێ هەڵبژێردراوە — بارکردن
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const storagePath = `products/${Date.now()}_${file.name}`;
                const storageReference = firebase.storageRef(firebase.storage, storagePath);
                
                await firebase.uploadBytes(storageReference, file);
                const downloadURL = await firebase.getDownloadURL(storageReference);
                imageUrls.push(downloadURL);
            }
        } else if (productId && currentEditingImages.length > 0) {
            // وێنەی نوێ نیە — وێنەکانی کۆن بمێنن
            imageUrls = [...currentEditingImages];
        } else if (productId) {
            // ئەگەر currentEditingImages بەتاڵ بوو، ڕاستەوخۆ لە Firebase بگرە
            try {
                const existingRef = firebase.ref(firebase.db, `products/${productId}`);
                const existingSnap = await firebase.get(existingRef);
                const existingProduct = existingSnap.val();
                if (existingProduct && existingProduct.images) {
                    imageUrls = existingProduct.images;
                }
            } catch(e) {
                console.warn("نەتوانرا وێنەکانی کۆن بگیردرێن:", e);
            }
        }
        
        // productData بنیاد — بەبێ images
        const productData = {
            name: productName,
            price: parseFloat(productPrice),
            priceUSD: parseFloat(productPriceUSD),
            category: productCategory,
            colorQuantity: colorQuantityData,
            updatedAt: new Date().toISOString()
        };
        
        // images تەنها دانرێت ئەگەر هەیە
        if (imageUrls.length > 0) {
            productData.images = imageUrls;
        }
        
        // createdAt تەنها بۆ کالای نوێ
        if (!productId) {
            productData.createdAt = new Date().toISOString();
        }
        
        // ذەخیرەکردن لە Firebase
        if (productId) {
            const productRef = firebase.ref(firebase.db, `products/${productId}`);
            await firebase.update(productRef, productData);
            alert("✅ کالا بە سەرکەوتوویی نوێکرایەوە!");
        } else {
            const productsRef = firebase.ref(firebase.db, 'products');
            const newProductRef = firebase.push(productsRef);
            await firebase.set(newProductRef, productData);
            alert("✅ کالا بە سەرکەوتوویی زیادکرا!");
        }
        
        resetProductForm();
        
        // ✅ چاوەڕوانی بارکردنی داتای نوێ پێش نیشاندان
        await loadProductsFromFirebase();
        
        if (productId) {
            showAllProductsInDashboard();
        } else {
            showAdminDashboard();
        }
        
    } catch (error) {
        console.error("Error submitting product:", error);
        alert("❌ هەڵە لە ناردنی کالا: " + error.message);
    } finally {
        submitText.textContent = productId ? 'نوێکردنەوەی کالا' : 'زیادکردنی کالا';
        spinner.style.display = 'none';
    }
}

async function submitPromoForm(event) {
    event.preventDefault();
    
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    const submitBtn = document.getElementById('submitPromoBtn');
    const spinner = document.getElementById('submitPromoSpinner');
    const submitText = document.getElementById('submitPromoText');
    
    submitText.textContent = 'ناردن...';
    spinner.style.display = 'inline-block';
    
    try {
        const promoTitle = document.getElementById('promoTitle').value;
        const promoSubtitle = document.getElementById('promoSubtitle').value;
        const promoDiscountText = document.getElementById('promoDiscountText').value;
        const promoTextColor = document.getElementById('promoTextColor').value;
        
        const imageFiles = document.getElementById('promoImage').files;
        let imageUrls = [];
        
        if (imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const storagePath = `promo/${Date.now()}_${file.name}`;
                const storageReference = firebase.storageRef(firebase.storage, storagePath);
                
                await firebase.uploadBytes(storageReference, file);
                const downloadURL = await firebase.getDownloadURL(storageReference);
                imageUrls.push(downloadURL);
            }
        }
        
        const promoData = {
            title: promoTitle,
            subtitle: promoSubtitle,
            discountText: promoDiscountText,
            textColor: promoTextColor,
            images: imageUrls,
            updatedAt: new Date().toISOString()
        };
        
        const promoRef = firebase.ref(firebase.db, 'promo');
        await firebase.set(promoRef, promoData);
        
        alert("✅ ڕیکلام بە سەرکەوتوویی نوێکرایەوە!");
        updatePromoBanner(promoData);
        showAdminDashboard();
        
    } catch (error) {
        console.error("Error submitting promo:", error);
        alert("❌ هەڵە لە ناردنی ڕیکلام: " + error.message);
    } finally {
        submitText.textContent = 'نوێکردنەوەی ڕیکلام';
        spinner.style.display = 'none';
    }
}

function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('formTitle').textContent = 'زیادکردنی کالای نوێ';
    document.getElementById('submitText').textContent = 'زیادکردنی کالا';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('currentImages').style.display = 'none';
    document.getElementById('fileName').textContent = '';
    currentEditingImages = [];
}

function showAddPromoForm() {
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('addPromoForm').style.display = 'block';
    
    if (promoData) {
        document.getElementById('promoTitle').value = promoData.title || '';
        document.getElementById('promoSubtitle').value = promoData.subtitle || '';
        document.getElementById('promoDiscountText').value = promoData.discountText || '';
        document.getElementById('promoTextColor').value = promoData.textColor || '#ffffff';
        
        const previewContainer = document.getElementById('promoImagesPreviewContainer');
        if (previewContainer && promoData.images) {
            previewContainer.innerHTML = '';
            promoData.images.forEach(image => {
                const img = document.createElement('img');
                img.src = image;
                img.className = 'w-full h-24 object-cover rounded';
                previewContainer.appendChild(img);
            });
        }
    }
    
    document.getElementById('addPromoForm').scrollIntoView({ behavior: 'smooth' });
}

// فەنکشنەکانی دەستکاری کۆپی کراوەکان
window.editCopiedSellerProduct = function(productId, product) {
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('editSellerProductFormSection').style.display = 'block';
    
    document.getElementById('editSellerProductId').value = productId;
    document.getElementById('editSellerProductName').value = product.name || '';
    document.getElementById('editSellerProductPrice').value = product.price || '';
    document.getElementById('editSellerProductPriceUSD').value = product.priceUSD || '';
    document.getElementById('editSellerProductCategory').value = product.category || '';
    document.getElementById('editSellerProductOriginalPrice').value = product.originalPrice || '';
    document.getElementById('editSellerProductDiscount').value = product.discount || '';
    document.getElementById('editSellerProductDescription').value = product.description || '';
}

window.editCopiedCustomerRequest = function(requestId, request) {
    document.getElementById('copiedProductsSection').style.display = 'none';
    document.getElementById('editCustomerRequestFormSection').style.display = 'block';
    
    document.getElementById('editCustomerRequestId').value = requestId;
    document.getElementById('editCustomerName').value = request.customerName || '';
    document.getElementById('editCustomerPhone').value = request.customerPhone || '';
    document.getElementById('editCustomerAddress').value = request.customerAddress || '';
    document.getElementById('editRequestProduct').value = request.productName || '';
    document.getElementById('editRequestDescription').value = request.productDescription || '';
    document.getElementById('editRequestQuantity').value = request.quantity || '1';
}

async function updateCopiedSellerProduct(event) {
    event.preventDefault();
    
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    try {
        const productId = document.getElementById('editSellerProductId').value;
        const productData = {
            name: document.getElementById('editSellerProductName').value,
            price: document.getElementById('editSellerProductPrice').value,
            priceUSD: document.getElementById('editSellerProductPriceUSD').value,
            category: document.getElementById('editSellerProductCategory').value,
            originalPrice: document.getElementById('editSellerProductOriginalPrice').value || null,
            discount: document.getElementById('editSellerProductDiscount').value || null,
            description: document.getElementById('editSellerProductDescription').value || '',
            updatedAt: new Date().toISOString()
        };
        
        const productRef = firebase.ref(firebase.db, `copiedSellerProducts/${productId}`);
        await firebase.update(productRef, productData);
        
        alert("✅ کالا بە سەرکەوتوویی نوێکرایەوە!");
        showCopiedProductsSection();
        
    } catch (error) {
        console.error("Error updating copied seller product:", error);
        alert("❌ هەڵە لە نوێکردنەوەی کالا: " + error.message);
    }
}

async function updateCopiedCustomerRequest(event) {
    event.preventDefault();
    
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    try {
        const requestId = document.getElementById('editCustomerRequestId').value;
        const requestData = {
            customerName: document.getElementById('editCustomerName').value,
            customerPhone: document.getElementById('editCustomerPhone').value,
            customerAddress: document.getElementById('editCustomerAddress').value,
            productName: document.getElementById('editRequestProduct').value,
            productDescription: document.getElementById('editRequestDescription').value || '',
            quantity: document.getElementById('editRequestQuantity').value,
            updatedAt: new Date().toISOString()
        };
        
        const requestRef = firebase.ref(firebase.db, `copiedCustomerRequests/${requestId}`);
        await firebase.update(requestRef, requestData);
        
        alert("✅ داواکاری بە سەرکەوتوویی نوێکرایەوە!");
        showCopiedProductsSection();
        
    } catch (error) {
        console.error("Error updating copied customer request:", error);
        alert("❌ هەڵە لە نوێکردنەوەی داواکاری: " + error.message);
    }
}

window.deleteCopiedSellerProduct = async function(productId) {
    console.log("🔍 deleteCopiedSellerProduct called with productId:", productId);
    console.log("🔍 isAdminLoggedIn:", isAdminLoggedIn);
    
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت ئەم کالا بسڕیتەوە؟")) {
        console.log("❌ User cancelled deletion");
        return;
    }
    
    try {
        console.log("🔄 Attempting to delete from copiedSellerProducts...");
        const productRef = firebase.ref(firebase.db, `copiedSellerProducts/${productId}`);
        
        // 🔥 وەرگرتنی زانیاری کالا بۆ سڕینەوەی وێنەکان
        const snapshot = await firebase.get(productRef);
        const product = snapshot.val();
        
        // 🗑️ سڕینەوەی وێنەکان لە Storage
        if (product && product.images && Array.isArray(product.images)) {
            console.log(`🖼️ Deleting ${product.images.length} images from storage...`);
            for (const imageUrl of product.images) {
                try {
                    const imagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
                    const imageRef = firebase.storageRef(firebase.storage, imagePath);
                    await firebase.deleteObject(imageRef);
                    console.log("✅ Image deleted:", imagePath);
                } catch (storageError) {
                    console.warn("⚠️ نەتوانرا وێنە بسڕدرێتەوە:", storageError);
                }
            }
        }
        
        // 🗑️ سڕینەوەی کالا لە Database
        await firebase.remove(productRef);
        
        console.log("✅ Product deleted successfully!");
        alert("✅ کالا و هەموو وێنەکانی سڕدرانەوە!");
        loadCopiedSellerProducts();
        
    } catch (error) {
        console.error("❌ Error deleting copied seller product:", error);
        alert("❌ هەڵە لە سڕینەوەی کالا: " + error.message);
    }
};

window.deleteCopiedCustomerRequest = async function(requestId) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت ئەم داواکاری بسڕیتەوە؟")) {
        return;
    }
    
    try {
        const requestRef = firebase.ref(firebase.db, `copiedCustomerRequests/${requestId}`);
        
        // 🔥 وەرگرتنی زانیاری داواکاری بۆ سڕینەوەی وێنەکان
        const snapshot = await firebase.get(requestRef);
        const request = snapshot.val();
        
        // 🗑️ سڕینەوەی وێنەکان لە Storage
        if (request && request.images && Array.isArray(request.images)) {
            console.log(`🖼️ Deleting ${request.images.length} images from storage...`);
            for (const imageUrl of request.images) {
                try {
                    const imagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
                    const imageRef = firebase.storageRef(firebase.storage, imagePath);
                    await firebase.deleteObject(imageRef);
                    console.log("✅ Image deleted:", imagePath);
                } catch (storageError) {
                    console.warn("⚠️ نەتوانرا وێنە بسڕدرێتەوە:", storageError);
                }
            }
        }
        
        // 🗑️ سڕینەوەی داواکاری لە Database
        await firebase.remove(requestRef);
        
        alert("✅ داواکاری و هەموو وێنەکانی سڕدرایەوە!");
        loadCopiedCustomerRequests();
        
    } catch (error) {
        console.error("Error deleting copied customer request:", error);
        alert("❌ هەڵە لە سڕینەوەی داواکاری: " + error.message);
    }
}

// فەنکشنەکانی نمایشی کالاکان بۆ بەڕێوەبەر
function displayAllProducts(productsData) {
    const tableBody = document.getElementById('allProductsTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!productsData) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">هیچ کالایەک بوونی نیە</td></tr>';
        return;
    }
    
    Object.entries(productsData).forEach(([productId, product]) => {
        const images = product.images || (product.imageUrl ? [product.imageUrl] : []);
        const firstImage = images.length > 0 ? images[0] : PLACEHOLDER_IMAGE;
        
        // ✅ cache-busting بۆ نیشاندانی وێنەی تازە
        const ts = product.updatedAt ? new Date(product.updatedAt).getTime() : Date.now();
        const displayImage = firstImage !== PLACEHOLDER_IMAGE
            ? (firstImage.includes('?') ? `${firstImage}&_t=${ts}` : `${firstImage}?_t=${ts}`)
            : PLACEHOLDER_IMAGE;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <img src="${displayImage}" alt="${product.name}" class="product-table-image" 
                     onerror="this.src='${PLACEHOLDER_IMAGE}'">
            </td>
            <td>${product.name || 'ناونەزانراو'}</td>
            <td>${product.category || 'نادیار'}</td>
            <td>${product.price || '0'} دینار</td>
            <td>$${product.priceUSD || '0'}</td>
            <td>
                <div class="table-actions">
                    <button class="table-btn table-edit-btn" onclick="editProduct('${productId}')">
                        دەستکاری
                    </button>
                    <button class="table-btn table-delete-btn" onclick="deleteProduct('${productId}')">
                        سڕینەوە
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function editProduct(productId) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    try {
        const productRef = firebase.ref(firebase.db, `products/${productId}`);
        const snapshot = await firebase.get(productRef);
        const product = snapshot.val();
        
        if (!product) {
            alert("کالا نەدۆزرایەوە!");
            return;
        }
        
        document.getElementById('productId').value = productId;
        document.getElementById('productName').value = product.name || '';
        // لاینی productPrice سڕایەوە چونکە ئەو خانەیە لە HTML دا نیە
        document.getElementById('productPriceUSD').value = product.priceUSD || '';
        document.getElementById('productCategory').value = product.category || '';
        
        // بارکردنی رەنگ و ژمارەکان
        const container = document.getElementById('colorQuantityContainer');
        if (container && product.colorQuantity) {
            container.innerHTML = ''; // سڕینەوەی رەنگە کۆنەکان
            
            Object.entries(product.colorQuantity).forEach(([color, quantity]) => {
                const row = document.createElement('div');
                row.className = 'color-quantity-row';
                row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
                
                // دەرکەوتنی ئایا رەنگەکە hex code یە یان ناو
                const isHexColor = color.startsWith('#');
                const colorValue = isHexColor ? color : '#000000';
                const colorName = isHexColor ? '' : color;
                
                row.innerHTML = `
                    <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                        <input type="color" class="color-picker" value="${colorValue}"
                               style="width: 50px; height: 42px; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer;">
                        <input type="text" class="color-name" placeholder="ناوی رەنگ (ئارەزوومەندانە)" value="${colorName}"
                               style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                    </div>
                    <input type="number" class="quantity-input" placeholder="ژمارە" min="0" value="${quantity}"
                           style="width: 100px; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                    <button type="button" onclick="removeColorRow(this)" 
                            style="background: #ef4444; color: white; padding: 10px; border-radius: 8px; border: none; cursor: pointer;">
                        ×
                    </button>
                `;
                container.appendChild(row);
            });
        }
        
        document.getElementById('formTitle').textContent = 'دەستکاری کالا';
        document.getElementById('submitText').textContent = 'نوێکردنەوەی کالا';
        document.getElementById('cancelEditBtn').style.display = 'block';
        
        currentEditingImages = product.images || [];
        if (currentEditingImages.length > 0) {
            document.getElementById('currentImages').style.display = 'block';
            const previewContainer = document.getElementById('currentImagesPreview');
            previewContainer.innerHTML = '';
            
            currentEditingImages.forEach((image, index) => {
                // ✅ زیادکردنی cache-busting بۆ نیشاندانی وێنەی تازە
                const cacheBustedUrl = image.includes('?') 
                    ? `${image}&_t=${Date.now()}` 
                    : `${image}?_t=${Date.now()}`;
                const imgContainer = document.createElement('div');
                imgContainer.className = 'image-preview';
                imgContainer.innerHTML = `
                    <img src="${cacheBustedUrl}" alt="وێنەی کالا">
                    <button type="button" class="remove-image-btn" onclick="removeCurrentImage(${index})">×</button>
                `;
                previewContainer.appendChild(imgContainer);
            });
        }
        
        document.getElementById('allProductsSection').style.display = 'none';
        document.getElementById('addProductForm').style.display = 'block';
        
        document.getElementById('addProductForm').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error("Error loading product for edit:", error);
        alert("❌ هەڵە لە بارکردنی کالا بۆ دەستکاری!");
    }
}

async function deleteProduct(productId) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت ئەم کالا بسڕیتەوە؟")) {
        return;
    }
    
    try {
        const productRef = firebase.ref(firebase.db, `products/${productId}`);
        const snapshot = await firebase.get(productRef);
        const product = snapshot.val();
        
        if (product && product.images && Array.isArray(product.images)) {
            for (const imageUrl of product.images) {
                try {
                    const imagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
                    const imageRef = firebase.storageRef(firebase.storage, imagePath);
                    await firebase.deleteObject(imageRef);
                } catch (storageError) {
                    console.warn("نەتوانرا وێنە بسڕدرێتەوە:", storageError);
                }
            }
        }
        
        await firebase.remove(productRef);
        
        alert("✅ کالا سڕدرایەوە!");
        loadProductsFromFirebase();
        displayAllProducts(globalProductsData);
        
    } catch (error) {
        console.error("Error deleting product:", error);
        alert("❌ هەڵە لە سڕینەوەی کالا!");
    }
}

function removeCurrentImage(index) {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (confirm("دڵنیایت کە دەتەوێت ئەم وێنە بسڕیتەوە؟")) {
        currentEditingImages.splice(index, 1);
        
        const previewContainer = document.getElementById('currentImagesPreview');
        previewContainer.innerHTML = '';
        
        if (currentEditingImages.length > 0) {
            currentEditingImages.forEach((image, idx) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'image-preview';
                imgContainer.innerHTML = `
                    <img src="${image}" alt="وێنەی کالا">
                    <button type="button" class="remove-image-btn" onclick="removeCurrentImage(${idx})">×</button>
                `;
                previewContainer.appendChild(imgContainer);
            });
        } else {
            document.getElementById('currentImages').style.display = 'none';
        }
    }
}

// فەنکشنەکانی تابەکان
window.showTab = function(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns) {
        tabBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.classList.remove('border-b-2', 'border-blue-500');
            btn.style.borderBottom = 'none';
        });
    }
    
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabContents) {
        tabContents.forEach(content => {
            content.style.display = 'none';
        });
    }
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = 'block';
    }
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(
        btn => btn.onclick && btn.onclick.toString().includes(tabId)
    );
    
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.classList.add('border-b-2', 'border-blue-500');
    }
};

// فەنکشنەکانی بارکردنی داواکارییەکان
async function loadSellerProductsForView() {
    try {
        const productsRef = firebase.ref(firebase.db, 'sellerProducts');
        const snapshot = await firebase.get(productsRef);
        const productsData = snapshot.val();
        
        const pendingContainer = document.getElementById('sellerPendingList');
        const approvedContainer = document.getElementById('sellerApprovedList');
        const rejectedContainer = document.getElementById('sellerRejectedList');
        
        if (!productsData) {
            if (pendingContainer) pendingContainer.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ کالایەک نیە</p>';
            if (approvedContainer) approvedContainer.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ کالایەک نیە</p>';
            if (rejectedContainer) rejectedContainer.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ کالایەک نیە</p>';
            return;
        }
        
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        
        if (pendingContainer) pendingContainer.innerHTML = '';
        if (approvedContainer) approvedContainer.innerHTML = '';
        if (rejectedContainer) rejectedContainer.innerHTML = '';
        
        Object.entries(productsData).forEach(([productId, product]) => {
            const images = product.images || [];
            const firstImage = images.length > 0 ? images[0] : '' + PLACEHOLDER_IMAGE + '';
            
            const productHTML = `
                <div class="bg-white p-4 rounded-lg border ${product.status === 'approved' ? 'border-green-200 bg-green-50' : product.status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'} mb-3">
                    <div class="flex gap-4">
                        <div class="flex-shrink-0">
                            <img src="${firstImage}" alt="${product.name || 'کالا'}" 
                                 class="w-20 h-20 object-cover rounded-lg cursor-pointer"
                                 onclick="openImageModal('${firstImage}')"
                                 onerror="this.src='' + PLACEHOLDER_IMAGE + ''">
                            ${images.length > 1 ? `<p class="text-xs text-blue-600 mt-1">${images.length} وێنە</p>` : ''}
                        </div>
                        
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <strong class="text-base">${product.name || 'ناونەزانراو'}</strong>
                                <span class="text-xs px-2 py-1 rounded ${product.status === 'approved' ? 'bg-green-500 text-white' : product.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}">
                                    ${product.status === 'approved' ? 'پەسەندکراو' : product.status === 'rejected' ? 'ڕەتکراوە' : 'چاوەڕوانی'}
                                </span>
                            </div>
                            
                            ${product.sellerName ? `<p class="text-sm text-gray-600"><strong>فرۆشیار:</strong> ${product.sellerName}</p>` : ''}
                            ${product.sellerPhone ? `<p class="text-sm text-gray-600"><strong>ژمارە:</strong> ${product.sellerPhone}</p>` : ''}
                            <p class="text-sm text-gray-600"><strong>نرخ:</strong> ${product.price} ${product.currency === 'USD' ? '$' : 'دینار'}</p>
                            ${product.category ? `<p class="text-sm text-gray-600"><strong>جۆر:</strong> ${product.category}</p>` : ''}
                            ${product.description ? `<p class="text-sm text-gray-600"><strong>تێبینی:</strong> ${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</p>` : ''}
                            <p class="text-xs text-gray-500 mt-2">${new Date(product.createdAt).toLocaleString('ku')}</p>
                        </div>
                        
                        <div class="flex flex-col gap-2">
                            ${product.status === 'pending' ? `
                                <button onclick="approveSellerProductNew('${productId}')" 
                                        class="text-xs bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 whitespace-nowrap">
                                    ✓ پەسەندکردن
                                </button>
                                <button onclick="rejectSellerProduct('${productId}')" 
                                        class="text-xs bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 whitespace-nowrap">
                                    ✗ ڕەتکردنەوە
                                </button>
                            ` : ''}
                            <button onclick="deleteSellerProduct('${productId}')" 
                                    class="text-xs bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 whitespace-nowrap">
                                🗑 سڕینەوە
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            if (product.status === 'approved') {
                approvedCount++;
                if (approvedContainer) approvedContainer.innerHTML += productHTML;
            } else if (product.status === 'rejected') {
                rejectedCount++;
                if (rejectedContainer) rejectedContainer.innerHTML += productHTML;
            } else {
                pendingCount++;
                if (pendingContainer) pendingContainer.innerHTML += productHTML;
            }
        });
        
        document.getElementById('sellerPendingCount').textContent = pendingCount;
        
    } catch (error) {
        console.error("Error loading seller products for view:", error);
    }
}

async function loadCustomerRequestsForView() {
    try {
        const requestsRef = firebase.ref(firebase.db, 'customerRequests');
        const snapshot = await firebase.get(requestsRef);
        const requestsData = snapshot.val();
        
        const pendingContainer = document.getElementById('customerPendingList');
        const approvedContainer = document.getElementById('customerApprovedList');
        const rejectedContainer = document.getElementById('customerRejectedList');
        
        if (!requestsData) {
            if (pendingContainer) pendingContainer.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ داواکارییەک نیە</p>';
            if (approvedContainer) approvedContainer.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ داواکارییەک نیە</p>';
            if (rejectedContainer) rejectedContainer.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ داواکارییەک نیە</p>';
            return;
        }
        
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        
        if (pendingContainer) pendingContainer.innerHTML = '';
        if (approvedContainer) approvedContainer.innerHTML = '';
        if (rejectedContainer) rejectedContainer.innerHTML = '';
        
        Object.entries(requestsData).forEach(([requestId, request]) => {
            const images = request.images || [];
            const firstImage = images.length > 0 ? images[0] : '';
            
            const requestHTML = `
                <div class="bg-white p-4 rounded-lg border ${request.status === 'approved' ? 'border-green-200 bg-green-50' : request.status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'} mb-3">
                    <div class="flex justify-between items-start gap-4">
                        ${firstImage ? `
                            <div class="flex-shrink-0">
                                <img src="${firstImage}" alt="وێنەی کالا" 
                                     class="w-20 h-20 object-cover rounded-lg cursor-pointer"
                                     onclick="openImageModal('${firstImage}')">
                                ${images.length > 1 ? `<p class="text-xs text-blue-600 mt-1">${images.length} وێنە</p>` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <strong class="text-base">${request.productName || 'ناونەزانراو'}</strong>
                                <span class="text-xs px-2 py-1 rounded ${request.status === 'approved' ? 'bg-green-500 text-white' : request.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}">
                                    ${request.status === 'approved' ? 'پەسەندکراو' : request.status === 'rejected' ? 'ڕەتکراوە' : 'چاوەڕوانی'}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600"><strong>کڕیار:</strong> ${request.customerName || 'نادیار'}</p>
                            <p class="text-sm text-gray-600"><strong>ژمارە:</strong> ${request.customerPhone || 'نادیار'}</p>
                            <p class="text-sm text-gray-600"><strong>ناونیشان:</strong> ${request.customerAddress || 'نادیار'}</p>
                            <p class="text-sm text-gray-600"><strong>ژمارە:</strong> ${request.quantity || '1'}</p>
                            ${request.productDescription ? `<p class="text-sm text-gray-600"><strong>تێبینی:</strong> ${request.productDescription}</p>` : ''}
                            <p class="text-xs text-gray-500 mt-2">${new Date(request.timestamp || Date.now()).toLocaleString('ku')}</p>
                        </div>
                        
                        <div class="flex flex-col gap-2">
                            ${request.status === 'pending' ? `
                                <button onclick="approveCustomerRequestNew('${requestId}')" 
                                        class="text-xs bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 whitespace-nowrap">
                                    ✓ پەسەندکردن
                                </button>
                                <button onclick="rejectRequest('${requestId}', 'customerRequests')" 
                                        class="text-xs bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 whitespace-nowrap">
                                    ✗ ڕەتکردنەوە
                                </button>
                            ` : ''}
                            <button onclick="deleteRequest('${requestId}', 'customerRequests')" 
                                    class="text-xs bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 whitespace-nowrap">
                                🗑 سڕینەوە
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            if (request.status === 'approved') {
                approvedCount++;
                if (approvedContainer) approvedContainer.innerHTML += requestHTML;
            } else if (request.status === 'rejected') {
                rejectedCount++;
                if (rejectedContainer) rejectedContainer.innerHTML += requestHTML;
            } else {
                pendingCount++;
                if (pendingContainer) pendingContainer.innerHTML += requestHTML;
            }
        });
        
        document.getElementById('requestsPendingCount').textContent = pendingCount;
        
    } catch (error) {
        console.error("Error loading customer requests for view:", error);
    }
}

window.showSellerProductsTab = function(tab) {
    document.getElementById('sellerPendingList').style.display = 'none';
    document.getElementById('sellerApprovedList').style.display = 'none';
    document.getElementById('sellerRejectedList').style.display = 'none';
    
    const tabBtns = document.querySelectorAll('#sellerProductsView .tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('border-b-2', 'border-blue-500');
    });
    
    if (tab === 'pending') {
        document.getElementById('sellerPendingList').style.display = 'block';
        tabBtns[0].classList.add('active', 'border-b-2', 'border-blue-500');
    } else if (tab === 'approved') {
        document.getElementById('sellerApprovedList').style.display = 'block';
        tabBtns[1].classList.add('active', 'border-b-2', 'border-blue-500');
    } else if (tab === 'rejected') {
        document.getElementById('sellerRejectedList').style.display = 'block';
        tabBtns[2].classList.add('active', 'border-b-2', 'border-blue-500');
    }
};

window.showCustomerRequestsTab = function(tab) {
    document.getElementById('customerPendingList').style.display = 'none';
    document.getElementById('customerApprovedList').style.display = 'none';
    document.getElementById('customerRejectedList').style.display = 'none';
    
    const tabBtns = document.querySelectorAll('#customerRequestsView .tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('border-b-2', 'border-blue-500');
    });
    
    if (tab === 'pending') {
        document.getElementById('customerPendingList').style.display = 'block';
        tabBtns[0].classList.add('active', 'border-b-2', 'border-blue-500');
    } else if (tab === 'approved') {
        document.getElementById('customerApprovedList').style.display = 'block';
        tabBtns[1].classList.add('active', 'border-b-2', 'border-blue-500');
    } else if (tab === 'rejected') {
        document.getElementById('customerRejectedList').style.display = 'block';
        tabBtns[2].classList.add('active', 'border-b-2', 'border-blue-500');
    }
};

window.closeSellerProductsView = function() {
    document.getElementById('sellerProductsView').style.display = 'none';
    showAdminDashboard();
};

window.closeCustomerRequestsView = function() {
    document.getElementById('customerRequestsView').style.display = 'none';
    showAdminDashboard();
};

window.approveAllCustomerRequests = async function() {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت هەموو داواکارییەکان پەسەند بکەیت؟")) {
        return;
    }
    
    try {
        const requestsRef = firebase.ref(firebase.db, 'customerRequests');
        const requestsSnapshot = await firebase.get(requestsRef);
        const requests = requestsSnapshot.val();
        
        if (!requests) {
            alert("هیچ داواکارییەک نیە!");
            return;
        }
        
        let approvedCount = 0;
        
        for (const requestId of Object.keys(requests)) {
            const request = requests[requestId];
            if (request.status === 'pending') {
                const copiedRequestsRef = firebase.ref(firebase.db, 'copiedCustomerRequests');
                const newRequestRef = firebase.push(copiedRequestsRef);
                
                const requestData = {
                    customerName: request.customerName,
                    customerPhone: request.customerPhone,
                    customerAddress: request.customerAddress,
                    productName: request.productName,
                    productDescription: request.productDescription,
                    quantity: request.quantity,
                    images: request.images || [],
                    timestamp: request.timestamp,
                    reviewedAt: new Date().toISOString(),
                    reviewedBy: 'admin',
                    status: 'approved'
                };
                
                await firebase.set(newRequestRef, requestData);
                
                await firebase.update(firebase.ref(firebase.db, `customerRequests/${requestId}`), {
                    reviewed: true,
                    status: 'approved',
                    reviewedAt: new Date().toISOString(),
                    reviewedBy: 'admin'
                });
                
                approvedCount++;
            }
        }
        
        if (approvedCount > 0) {
            alert(`✅ ${approvedCount} داواکاری پەسەندکران!`);
        } else {
            alert("هیچ داواکارییەکی نوێ نیە!");
        }
        
        loadCustomerRequestsForView();
        updateNotificationBadge();
        
    } catch (error) {
        console.error("Error approving all customer requests:", error);
        alert("❌ هەڵە لە پەسەندکردنی هەموو!");
    }
};

window.deleteAllCustomerRequests = async function() {
    if (!isAdminLoggedIn) {
        alert("تەنها بەڕێوەبەر دەتوانێت!");
        return;
    }
    
    if (!confirm("دڵنیایت کە دەتەوێت هەموو داواکارییەکان بسڕیتەوە؟")) {
        return;
    }
    
    try {
        const requestsRef = firebase.ref(firebase.db, 'customerRequests');
        const requestsSnapshot = await firebase.get(requestsRef);
        const requests = requestsSnapshot.val();
        
        if (requests) {
            let deletedCount = 0;
            for (const requestId of Object.keys(requests)) {
                if (requests[requestId].status === 'pending') {
                    await firebase.remove(firebase.ref(firebase.db, `customerRequests/${requestId}`));
                    deletedCount++;
                }
            }
            alert(`✅ ${deletedCount} داواکاری سڕدرایەوە!`);
        } else {
            alert("هیچ داواکارییەک نیە!");
        }
        
        loadCustomerRequestsForView();
        updateNotificationBadge();
        
    } catch (error) {
        console.error("Error deleting all customer requests:", error);
        alert("❌ هەڵە لە سڕینەوە!");
    }
};

// فەنکشنەکانی FIB
document.getElementById('copyAccountBtn').addEventListener('click', function() {
    const accountNumber = 'IQ12345678901234567890';
    navigator.clipboard.writeText(accountNumber)
        .then(() => {
            alert("✅ ژمارەی حساب کۆپی کرا!");
        })
        .catch(err => {
            console.error("Error copying account number:", err);
            alert("❌ نەتوانرا ژمارەی حساب کۆپی بکرێت!");
        });
});

// فەنکشنەکانی پێوەرکردنی وێنە
document.getElementById('customerProductImages').addEventListener('change', function(e) {
    const container = document.getElementById('customerImagePreviewContainer');
    const fileNameDiv = document.getElementById('customerFileName');
    const files = Array.from(e.target.files);
    
    if (files.length > 0) {
        fileNameDiv.textContent = files.length + ' وێنە هەڵبژێردراوە';
        container.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const div = document.createElement('div');
                div.className = 'image-preview-item';
                div.innerHTML = `
                    <img src="${event.target.result}" alt="وێنە ${index + 1}">
                    <button type="button" class="remove-image" onclick="removeCustomerImage(${index})">×</button>
                `;
                container.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    } else {
        fileNameDiv.textContent = '';
        container.innerHTML = '';
    }
});

window.removeCustomerImage = function(index) {
    const input = document.getElementById('customerProductImages');
    const dt = new DataTransfer();
    const files = Array.from(input.files);
    
    files.forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });
    
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
};

document.getElementById('sellerProductImages').addEventListener('change', function(e) {
    const container = document.getElementById('sellerImagePreviewContainer');
    const fileNameDiv = document.getElementById('sellerFileName');
    const files = Array.from(e.target.files);
    
    if (files.length > 0) {
        fileNameDiv.textContent = files.length + ' وێنە هەڵبژێردراوە';
        container.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const div = document.createElement('div');
                div.className = 'image-preview-item';
                div.innerHTML = `
                    <img src="${event.target.result}" alt="وێنە ${index + 0}">
                    <button type="button" class="remove-image" onclick="removeSellerImage(${index})">×</button>
                `;
                container.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    } else {
        fileNameDiv.textContent = '';
        container.innerHTML = '';
    }
});

window.removeSellerImage = function(index) {
    const input = document.getElementById('sellerProductImages');
    const dt = new DataTransfer();
    const files = Array.from(input.files);
    
    files.forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });
    
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
};

document.getElementById('productImages').addEventListener('change', function(e) {
    const container = document.getElementById('imagePreviewContainer');
    const fileNameDiv = document.getElementById('fileName');
    const files = Array.from(e.target.files);
    
    if (files.length > 0) {
        fileNameDiv.textContent = files.length + ' وێنە هەڵبژێردراوە';
        container.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const div = document.createElement('div');
                div.className = 'image-preview-item';
                div.innerHTML = `
                    <img src="${event.target.result}" alt="وێنە ${index + 1}">
                    <button type="button" class="remove-image" onclick="removeProductImage(${index})">×</button>
                `;
                container.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    } else {
        fileNameDiv.textContent = '';
        container.innerHTML = '';
    }
});

window.removeProductImage = function(index) {
    const input = document.getElementById('productImages');
    const dt = new DataTransfer();
    const files = Array.from(input.files);
    
    files.forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });
    
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
};

document.getElementById('promoImage').addEventListener('change', function(e) {
    const container = document.getElementById('promoImagesPreviewContainer');
    const fileNameDiv = document.getElementById('promoFileName');
    const files = Array.from(e.target.files);
    
    if (files.length > 0) {
        fileNameDiv.textContent = files.length + ' وێنە هەڵبژێردراوە';
        container.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.className = 'w-full h-24 object-cover rounded';
                container.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    } else {
        fileNameDiv.textContent = '';
        container.innerHTML = '';
    }
});

// فەنکشنەکانی چاوەڕوانی
document.getElementById('cancelEditBtn').addEventListener('click', function() {
    resetProductForm();
    showAllProductsInDashboard();
});

// فەنکشنەکانی خێراکردن
function getColorCode(colorName) {
    const colorMap = {
        'سور': '#dc2626',
        'شین': '#2563eb',
        'سەوز': '#16a34a',
        'زەرد': '#fbbf24',
        'رەش': '#000000',
        'سپی': '#ffffff',
        'قاوەیی': '#92400e',
        'پەمەیی': '#a855f7',
        'پرتەقاڵی': '#f97316',
        'قەیسی': '#06b6d4',
        'پەمبەیی': '#ec4899',
        'نیلی': '#4f46e5'
    };
    
    return colorMap[colorName.trim()] || '#6b7280';
}

// فانکشنەکانی داخستنی Seller Products View و Customer Requests View
window.closeSellerProductsView = function() {
    document.getElementById('sellerProductsView').style.display = 'none';
};

window.closeCustomerRequestsView = function() {
    document.getElementById('customerRequestsView').style.display = 'none';
};

// فانکشنی پیشاندانی تەنها نرخی کاڵا
window.showPriceOnly = function(productId) {
    const product = globalProductsData ? globalProductsData[productId] : null;
    
    if (!product) {
        alert('کاڵا نەدۆزرایەوە!');
        return;
    }
    
    // دروستکردنی modal سادە بۆ پیشاندانی نرخ بە دۆڵار
    const priceModal = document.createElement('div');
    priceModal.id = 'priceOnlyModal';
    priceModal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4';
    priceModal.style.display = 'flex';
    
    priceModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-right animate-scale-in" dir="rtl">
            <!-- سەرپەڕ -->
            <div class="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
                <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    نرخی کاڵا
                </h3>
                <button onclick="closePriceModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <!-- ناوی کاڵا -->
            <div class="mb-5">
                <p class="text-sm text-gray-500 mb-1">ناوی کاڵا:</p>
                <h4 class="text-base font-bold text-gray-800">${product.name}</h4>
            </div>
            
            <!-- نرخی دۆڵار -->
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 mb-4">
                <div>
                    <p class="text-xs text-gray-600 mb-1">نرخ:</p>
                    <p class="text-3xl font-black text-purple-600">$${product.priceUSD}</p>
                </div>
            </div>
            
            <!-- دوگمەی داخستن -->
            <button onclick="closePriceModal()" 
                    class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-bold transition-all">
                داخستن
            </button>
        </div>
    `;
    
    // زیادکردنی modal بۆ body
    document.body.appendChild(priceModal);
    
    // داخستن بە کلیکی لە background
    priceModal.addEventListener('click', function(e) {
        if (e.target === priceModal) {
            closePriceModal();
        }
    });
};

// فانکشنی داخستنی price modal
window.closePriceModal = function() {
    const modal = document.getElementById('priceOnlyModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 200);
    }
};

