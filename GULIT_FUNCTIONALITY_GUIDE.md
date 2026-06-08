# Gulit E-Commerce Platform - Comprehensive Functionality Guide

## Table of Contents
1. [Authentication & User Management](#1-authentication--user-management)
2. [Product Management & Discovery](#2-product-management--discovery)
3. [Shopping Cart & Favorites](#3-shopping-cart--favorites)
4. [Order Processing](#4-order-processing)
5. [Seller Management & Registration](#5-seller-management--registration)
6. [Admin Functionalities](#6-admin-functionalities)
7. [Distributed System Architecture](#7-distributed-system-architecture)

---

## 1. Authentication & User Management

### Overview
Gulit supports three user roles (Buyer, Seller, Admin) with JWT-based authentication, password reset functionality, Google OAuth integration, and profile management.

### Related Files

#### Backend Files:
- **`server/routes/userRoutes.js`** - Route definitions for user registration, login, password reset
- **`server/controllers/authController.js`** - Authentication logic (register, login, password reset, Google auth)
- **`server/controllers/userController.js`** - User profile management (favorites, browse history)
- **`server/models/userModel.js`** - User schema definition with address, role, preferences
- **`server/middleware/authMiddleware.js`** - JWT verification and role-based access control
- **`server/utils/googleAuth.js`** - Google credential verification
- **`server/utils/emailService.js`** - Email sending for password reset

#### Frontend Files:
- **`client/src/store/slices/usersApiSlice.js`** - RTK Query API endpoints for user operations
- **`client/src/store/slices/authSlice.js`** - Redux state management for auth
- **`client/src/pages/auth/RegisterScreen.jsx`** - User registration form
- **`client/src/pages/auth/LoginScreen.jsx`** - User login form
- **`client/src/pages/auth/ForgotPasswordScreen.jsx`** - Password reset flow
- **`client/src/utils/networkConfig.js`** - Backend failover logic for auth requests

### Functionality Flow

#### 1.1 User Registration (Buyer/Seller/Admin)

**Process Flow:**
```
Frontend (RegisterScreen.jsx)
    ↓
useRegisterMutation() [usersApiSlice.js]
    ↓
POST /api/users/register [userRoutes.js]
    ↓
registerUser() [authController.js]
    ↓
Check duplicate email → Hash password → Create User document [userModel.js]
    ↓
Dual-cluster write (Cluster A & B via db.js)
    ↓
Generate JWT token
    ↓
Response: { user, token }
    ↓
Frontend: Store token in localStorage, Update authSlice
```

**Files Involved:**
1. **Frontend**: `RegisterScreen.jsx` → collects name, email, password, role
2. **API Layer**: `usersApiSlice.js` → RTK Query mutation sends to backend
3. **Route**: `userRoutes.js` → POST /api/users/register
4. **Controller**: `authController.js` → `registerUser()` validates and creates user
5. **Model**: `userModel.js` → User schema with validation
6. **Database**: `db.js` → Dual-write to both MongoDB clusters
7. **Auth**: `generateToken()` → Creates JWT token

**Key Code Example (Backend):**
```javascript
// authController.js - registerUser function
const registerUser = async (req, res) => {
    const { name, email, password, role, shopName } = req.body;
    
    // Validation
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please add all fields' });
    }
    
    // Check duplicate
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create user with role-based fields
    const user = await User.create({
        name,
        email,
        password,
        role: role === 'seller' ? 'seller' : 'buyer',
        sellerProfile: role === 'seller' ? { shopName } : {}
    });
    
    res.status(201).json(formatUserResponse(user)); // Includes JWT token
};
```

### Use Cases & Scenarios

#### Use Case 1.1: Buyer Registration
**Actor:** New visitor wanting to browse products
**Scenario:**
- Visitor clicks "Sign Up" on homepage
- Fills form: name, email, password
- Clicks "Register as Buyer"
- System creates buyer account, generates JWT token
- User redirected to homepage with authentication
- Can now add to cart, checkout, view orders

**Files:** `RegisterScreen.jsx` → `authController.js` → `userModel.js`

#### Use Case 1.2: Seller Registration with KYC Documents
**Actor:** Vendor wanting to list products
**Scenario:**
- Vendor navigates to seller registration page
- Fills form: name, email, password, shop name
- Uploads KYC documents (ID, license, tax certificate)
- System processes uploads via `uploadSellerDocs` middleware
- Creates seller account + creates Seller model document
- Admin reviews KYC (see admin functionality)
- After approval, seller can list products

**Files:** 
- Frontend: `pages/seller/SellerRegister.jsx`
- Backend: `sellerRoutes.js` → `sellerController.js`
- Middleware: `uploadMiddleware.js`
- Models: `sellerModel.js`, `userModel.js`

#### Use Case 1.3: Password Reset Flow
**Actor:** User who forgot password
**Scenario:**
1. User clicks "Forgot Password" on login
2. Enters email address
3. System sends reset link via email (`emailService.js`)
4. Email contains token valid for 1 hour
5. User clicks link, enters new password
6. System verifies token, hashes new password, updates user
7. User can now login with new password

**Files:**
- `authController.js` → `forgotPassword()`, `verifyResetCode()`, `resetPassword()`
- `emailService.js` → Sends reset email
- `userModel.js` → Stores `resetPasswordToken` and `resetPasswordExpires`

#### Use Case 1.4: Google OAuth Integration
**Actor:** User preferring single sign-on
**Scenario:**
1. User clicks "Sign in with Google" button
2. Google login popup appears
3. User authenticates with Google account
4. Frontend receives credential token
5. Frontend sends token to backend: POST /api/users/google
6. Backend verifies token via `googleAuth.js`
7. If user exists, login; if not, create account
8. Return JWT token for session

**Files:**
- Frontend: `LoginScreen.jsx`, `RegisterScreen.jsx` (Google button)
- Backend: `authController.js` → `googleAuthUser()`
- Utility: `googleAuth.js` → `verifyGoogleCredential()`

#### Use Case 1.5: Profile Update
**Actor:** User updating address/contact info
**Scenario:**
1. User navigates to profile page
2. Edits shipping address, phone number
3. Clicks "Save Changes"
4. Frontend sends PUT /api/users/profile with updated data
5. Backend verifies JWT token via authMiddleware
6. Updates user document in both clusters
7. Response includes updated user object

**Files:**
- Frontend: `pages/account/ProfilePage.jsx`
- Backend: `userRoutes.js` → `authController.js` → `updateUserProfile()`
- Middleware: `authMiddleware.js` → `protect` middleware

### Distributed System Impact

**How it handles failures:**
- When Cluster B (MongoDB) is offline during registration:
  - User created on Cluster A (primary)
  - Operation queued in SyncQueue
  - Client receives success (transparent to user)
  - When Cluster B recovers, queued registration replayed

- When primary backend (Render) fails mid-login:
  - Frontend request times out
  - RTK Query catch handler triggers failover
  - Frontend rotates to secondary backend (Replit)
  - User retries login, routed to Replit
  - Replit processes login from Cluster A (or replayed from queue)

---

## 2. Product Management & Discovery

### Overview
Two distinct flows: Buyers discovering/browsing products, and Sellers creating/managing products.

### Related Files

#### Backend Files:
- **`server/routes/productRoutes.js`** - Public product browsing routes
- **`server/routes/sellerProductRoutes.js`** - Seller product management routes
- **`server/controllers/productController.js`** - Product retrieval, reviews, search
- **`server/controllers/sellerProductController.js`** - Seller product CRUD operations
- **`server/models/productModel.js`** - Product schema with pricing, inventory, reviews
- **`server/routes/categoryRoutes.js`** - Product category management
- **`server/models/categoryModel.js`** - Category schema

#### Frontend Files:
- **`client/src/store/slices/productsApiSlice.js`** - RTK Query for product fetching
- **`client/src/store/slices/sellerProductsApiSlice.js`** - Seller product API
- **`client/src/pages/products/HomePage.jsx`** - Browse all products
- **`client/src/pages/products/ProductScreen.jsx`** - Single product detail page
- **`client/src/pages/seller/SellerProductsPage.jsx`** - Seller's product list
- **`client/src/components/products/ProductCard.jsx`** - Product display component
- **`client/src/components/products/ProductReview.jsx`** - Review display/creation

### Functionality Flow

#### 2.1 Product Discovery (Buyer)

**Process Flow:**
```
Frontend (HomePage.jsx or SearchPage.jsx)
    ↓
useGetProductsQuery() [productsApiSlice.js]
    ↓
GET /api/products?search=...&category=...&sort=... [productRoutes.js]
    ↓
getProducts() [productController.js]
    ↓
Query Product model with filters/search/pagination [productModel.js]
    ↓
Populate seller info and reviews
    ↓
Response: [ { id, name, price, image, rating, seller, ... } ]
    ↓
Frontend: Display ProductCard for each product
```

**Files Involved:**
1. **Frontend**: `HomePage.jsx`, `SearchScreen.jsx` → Search/filter inputs
2. **API Layer**: `productsApiSlice.js` → `useGetProductsQuery()` with params
3. **Route**: `productRoutes.js` → GET /api/products
4. **Controller**: `productController.js` → `getProducts()` with filtering
5. **Model**: `productModel.js` → MongoDB query with aggregation
6. **Component**: `ProductCard.jsx` → Displays product info

**Key Code Example (Backend):**
```javascript
// productController.js - getProducts function
const getProducts = async (req, res) => {
    const { search, category, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;
    
    // Build filter object
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = minPrice;
        if (maxPrice) filter.price.$lte = maxPrice;
    }
    
    // Query and paginate
    const products = await Product.find(filter)
        .populate('seller', 'name email shopName')
        .sort(sort || '-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    
    res.json(products);
};
```

#### 2.2 Product Creation (Seller)

**Process Flow:**
```
Frontend (SellerProductForm.jsx)
    ↓
useCreateProductMutation() [sellerProductsApiSlice.js]
    ↓
POST /api/seller/products [sellerProductRoutes.js]
    ↓
protectSeller middleware → Verify seller JWT
    ↓
createProduct() [sellerProductController.js]
    ↓
Validate product data
    ↓
Create Product document with seller ID [productModel.js]
    ↓
Dual-cluster write (Cluster A & B via db.js)
    ↓
Emit Socket.IO event "productCreated" to all clients via peerSync.js
    ↓
Response: { productId, ... }
    ↓
Frontend: Redirect to product edit or inventory page
```

**Files Involved:**
1. **Frontend**: `pages/seller/SellerProductForm.jsx`
2. **API Layer**: `sellerProductsApiSlice.js` → `useCreateProductMutation()`
3. **Route**: `sellerProductRoutes.js` → POST /api/seller/products
4. **Middleware**: `authMiddleware.js` → `protectSeller`
5. **Controller**: `sellerProductController.js` → `createProduct()`
6. **Model**: `productModel.js` → Product schema
7. **Sync**: `peerSync.js` → Emit to peer backend via Socket.IO

#### 2.3 Product Update/Inventory Management (Seller)

**Process Flow:**
```
Frontend (Seller Dashboard)
    ↓
useUpdateProductMutation() [sellerProductsApiSlice.js]
    ↓
PUT /api/seller/products/:id [sellerProductRoutes.js]
    ↓
updateProduct() [sellerProductController.js]
    ↓
Verify seller owns this product
    ↓
Update Product document (price, inventory, description, images)
    ↓
Dual-cluster write via db.js
    ↓
Emit "productUpdated" Socket.IO event
    ↓
Frontend: Show success toast, refresh product list
```

**Use Cases:**
- Update product price/description
- Adjust inventory levels
- Upload new product images
- Change product category
- Mark product as out of stock

### Use Cases & Scenarios

#### Use Case 2.1: Browse Products with Filters
**Actor:** Buyer looking for specific product
**Scenario:**
1. Buyer visits homepage, sees product grid
2. Uses search bar to search "laptop"
3. Filters by category "Electronics", price "$500-$1000"
4. Sorts by "Latest"
5. System queries Product model with filters
6. Displays 12 products per page with pagination
7. Buyer clicks on product to see details

**Files:** `HomePage.jsx` → `productController.js` → `ProductCard.jsx`

#### Use Case 2.2: View Product Details & Reviews
**Actor:** Buyer evaluating a product
**Scenario:**
1. Buyer clicks on a product card
2. Routes to `ProductScreen.jsx` with product ID
3. Fetches product via `useGetProductByIdQuery()`
4. GET /api/products/:id → `getProductById()` [productController.js]
5. Displays:
   - Product images
   - Seller information
   - Price, description, specifications
   - Average rating and reviews
   - Stock availability
6. Shows "Add to Cart" or "Buy Now" button

**Files:** `ProductScreen.jsx` → `productController.js` → `productModel.js`

**Key Code (Backend):**
```javascript
const getProductById = async (req, res) => {
    const product = await Product.findById(req.params.id)
        .populate('seller', 'name email shopName rating')
        .populate('reviews.user', 'name');
    
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    
    // Calculate average rating
    const avgRating = product.reviews.length > 0 
        ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
        : 0;
    
    res.json({ ...product.toObject(), avgRating });
};
```

#### Use Case 2.3: Create Product Listing (Seller)
**Actor:** Seller adding new product to inventory
**Scenario:**
1. Seller logs in, navigates to "Add Product"
2. Fills form:
   - Product name, description
   - Category (Electronics, Clothing, etc.)
   - Price, stock quantity
   - Uploads 3-6 product images
3. Clicks "Create Product"
4. `sellerProductController.js` → `createProduct()` validates data
5. Creates Product document with seller ID
6. Images uploaded to server via `uploadMiddleware.js`
7. Product saved to both MongoDB clusters
8. Socket.IO event emitted: "productCreated"
9. Other sellers see product in marketplace
10. Seller redirected to product management page

**Files:**
- Frontend: `pages/seller/SellerProductForm.jsx`
- Backend: `sellerProductRoutes.js` → `sellerProductController.js`
- Middleware: `uploadMiddleware.js`
- Database: `productModel.js`
- Sync: `peerSync.js` (broadcasts to peer backend)

#### Use Case 2.4: Manage Product Inventory
**Actor:** Seller monitoring stock levels
**Scenario:**
1. Seller views "Inventory" page from dashboard
2. Shows all seller's products with current stock
3. System queries Product model filtered by seller ID
4. When stock drops below threshold, shows warning
5. Seller can:
   - Update stock quantity
   - Toggle "Out of Stock" status
   - Bulk upload inventory updates (CSV)
6. Each update:
   - Saves to both MongoDB clusters
   - Broadcasts "productUpdated" event
   - Buyers see real-time stock updates

**Files:** `pages/seller/InventoryPage.jsx` → `sellerProductController.js`

#### Use Case 2.5: Create Product Review (Buyer)
**Actor:** Buyer who received order, rating product
**Scenario:**
1. Buyer receives delivered product
2. Navigates to "My Orders"
3. Clicks "Write Review" on delivered product
4. Fills review form:
   - Rating (1-5 stars)
   - Review text (optional)
   - Uploads review photos (optional)
5. Submits review
6. POST /api/products/:id/reviews [productRoutes.js]
7. `createProductReview()` [productController.js]:
   - Verifies buyer purchased this product
   - Adds review to Product.reviews array
   - Updates product avgRating
8. Review visible on product page
9. Other buyers see this review

**Files:**
- Frontend: `components/products/ProductReview.jsx`
- Backend: `productController.js` → `createProductReview()`
- Model: `productModel.js` (reviews subdocument)

### Distributed System Considerations

**Product Listing Consistency:**
- When seller creates product on Render backend:
  - Product saved to Cluster A
  - Immediately replayed to Cluster B (dual-write)
  - Socket.IO "productCreated" event emitted
  - Event synced to Replit backend via `/api/internal/sync`
  - All connected clients (buyers) see new product

- If Cluster B offline:
  - Product created on Cluster A
  - Operation queued in SyncQueue
  - Buyers see product from Cluster A
  - When Cluster B recovers, product replayed
  - Complete consistency restored

---

## 3. Shopping Cart & Favorites

### Overview
Buyers can add products to cart for later purchase, mark favorites for wishlists, and browse history of viewed products.

### Related Files

#### Backend Files:
- **`server/routes/userRoutes.js`** - Cart and favorites endpoints
- **`server/controllers/cartController.js`** - Cart CRUD operations
- **`server/controllers/userController.js`** - Favorites and browse history
- **`server/models/userModel.js`** - Cart, favorites, browseHistory arrays

#### Frontend Files:
- **`client/src/store/slices/cartSlice.js`** - Local cart state management
- **`client/src/pages/cart/CartPage.jsx`** - Shopping cart display
- **`client/src/components/products/AddToCartButton.jsx`** - Add to cart UI
- **`client/src/components/products/FavoriteButton.jsx`** - Favorite toggle

### Functionality Flow

#### 3.1 Add to Cart

**Process Flow:**
```
Frontend (ProductScreen.jsx or ProductCard.jsx)
    ↓
Click "Add to Cart"
    ↓
useAddToCartMutation() [usersApiSlice.js]
    ↓
POST /api/users/cart (with productId, quantity) [userRoutes.js]
    ↓
protect middleware → Verify JWT
    ↓
addToCart() [cartController.js]
    ↓
Fetch product details (verify exists, get current price)
    ↓
Add to User.cart array (if already exists, update quantity)
    ↓
Dual-cluster write via db.js
    ↓
Also update cartSlice (Redux) for instant UI feedback
    ↓
Response: { cart: [...] }
    ↓
Frontend: Show toast notification "Added to cart"
```

**Files Involved:**
1. **Frontend UI**: `ProductScreen.jsx`, `ProductCard.jsx`
2. **State**: `cartSlice.js` (Redux local state for instant UI)
3. **API**: `usersApiSlice.js` → `useAddToCartMutation()`
4. **Route**: `userRoutes.js` → POST /api/users/cart
5. **Controller**: `cartController.js` → `addToCart()`
6. **Model**: `userModel.js` → cart field
7. **Database**: `db.js` → Dual-cluster write

**Key Code (Backend):**
```javascript
// cartController.js - addToCart function
const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user._id;
    
    // Verify product exists and get current price
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get user's cart
    const user = await User.findById(userId);
    
    // Check if product already in cart
    const cartItem = user.cart.find(item => item.product.toString() === productId);
    
    if (cartItem) {
        // Update quantity if already exists
        cartItem.quantity += quantity;
    } else {
        // Add new item to cart
        user.cart.push({
            product: productId,
            quantity,
            price: product.price, // Capture current price
            name: product.name,
            image: product.image
        });
    }
    
    await user.save(); // Triggers dual-cluster write via db.js
    res.json(user.cart);
};
```

#### 3.2 View Shopping Cart

**Process Flow:**
```
Frontend (CartPage.jsx)
    ↓
useGetCartQuery() [usersApiSlice.js]
    ↓
GET /api/users/cart [userRoutes.js]
    ↓
protect middleware
    ↓
getCart() [cartController.js]
    ↓
Fetch User document, return cart array with product details
    ↓
Response: [ { productId, quantity, price, name, image, ... } ]
    ↓
Frontend: Display cart items, calculate subtotal/tax/shipping
    ↓
Show "Proceed to Checkout" button
```

**Files:** `CartPage.jsx` → `cartController.js` → `userModel.js`

#### 3.3 Update Cart Item Quantity

**Process Flow:**
```
Frontend (CartPage.jsx)
    ↓
User changes quantity selector
    ↓
useSyncCartMutation() [usersApiSlice.js]
    ↓
PUT /api/users/cart [userRoutes.js] - Updates all items at once
    ↓
syncCart() [cartController.js]
    ↓
Replace entire cart with new array from request
    ↓
Save to both clusters
    ↓
Response: { cart: [...] }
    ↓
Frontend: Update CartPage display
```

#### 3.4 Add to Favorites (Wishlist)

**Process Flow:**
```
Frontend (ProductScreen.jsx)
    ↓
Click heart icon "Add to Favorites"
    ↓
useAddToFavoritesMutation() [usersApiSlice.js]
    ↓
POST /api/users/favorites [userRoutes.js]
    ↓
protect middleware
    ↓
addToFavorites() [userController.js]
    ↓
Add product to User.favorites array
    ↓
Dual-cluster write via db.js
    ↓
Response: { favorites: [...] }
    ↓
Frontend: Toggle heart icon to filled state
```

### Use Cases & Scenarios

#### Use Case 3.1: Add Multiple Items to Cart
**Actor:** Buyer shopping for multiple products
**Scenario:**
1. Buyer browses product catalog
2. Finds "Laptop" → clicks "Add to Cart" (qty: 1)
3. Toast shows "Added to cart"
4. Continues browsing
5. Finds "Mouse" → clicks "Add to Cart" (qty: 2)
6. Finds "Keyboard" → clicks "Add to Cart" (qty: 1)
7. Clicks cart icon in header
8. CartPage shows 3 items:
   - Laptop x1 @ $900
   - Mouse x2 @ $15 each
   - Keyboard x1 @ $50
9. Subtotal calculated automatically
10. Can update quantities or remove items

**Files:** 
- `ProductCard.jsx` (Add to cart button)
- `cartController.js` (Backend cart logic)
- `CartPage.jsx` (Cart display)

#### Use Case 3.2: Browse Favorites/Wishlist
**Actor:** Buyer comparing products
**Scenario:**
1. Buyer navigates to "My Favorites"
2. System calls `useGetFavoritesQuery()`
3. Displays all favorited products
4. Buyer can:
   - Move to cart ("Add all to cart" button)
   - Share wishlist with friend
   - Remove items
   - Track price drops (not implemented but could be)
5. Later, buyer returns to purchase from favorites

**Files:** `pages/account/FavoritesPage.jsx` → `userController.js`

#### Use Case 3.3: Browse History
**Actor:** Buyer re-finding product viewed earlier
**Scenario:**
1. Buyer clicks on product → `addToBrowseHistory()` called automatically
2. System adds product to User.browseHistory array
3. Buyer can access "Recently Viewed" section on homepage
4. Shows last 10 products viewed
5. Quick access to products being compared

**Files:** `userController.js` → `addToBrowseHistory()`

#### Use Case 3.4: Clear Cart
**Actor:** Buyer canceling order
**Scenario:**
1. Buyer clicks "Clear Cart" button
2. useDeleteCartMutation() called
3. User.cart array set to empty []
4. Cart saved to both clusters
5. CartPage shows "Your cart is empty"

**Files:** `cartController.js` → `clearCart()`

### Distributed System Impact

**Cart Consistency:**
- Cart stored in User document
- When cart updated on Render:
  - Saved to Cluster A
  - Immediately replayed to Cluster B
  - User sees consistent cart across both clusters

- If user switches backends mid-session:
  - sessionStorage has activeBackendUrl
  - All requests route to same backend
  - Consistent cart view maintained

- If Cluster B offline:
  - Cart saved to Cluster A
  - Queued for Cluster B
  - User continues shopping on single cluster
  - Eventually consistent when Cluster B recovers

---

## 4. Order Processing

### Overview
Complete order lifecycle from creation through payment to delivery and refund management.

### Related Files

#### Backend Files:
- **`server/routes/orderRoutes.js`** - Order endpoints with Socket.IO integration
- **`server/controllers/orderController.js`** - Order creation, status updates, refunds
- **`server/controllers/paymentController.js`** - Payment gateway integration (Chapa)
- **`server/models/orderModel.js`** - Order schema with payment and delivery info
- **`server/utils/peerSync.js`** - Socket.IO event broadcasting to peer backend

#### Frontend Files:
- **`client/src/store/slices/ordersApiSlice.js`** - Order API endpoints
- **`client/src/pages/checkout/CheckoutPage.jsx`** - Checkout form
- **`client/src/pages/orders/OrderDetailsPage.jsx`** - Single order details
- **`client/src/pages/orders/MyOrdersPage.jsx`** - Order history/list

### Functionality Flow

#### 4.1 Create Order (Checkout)

**Process Flow:**
```
Frontend (CheckoutPage.jsx)
    ↓
User fills shipping address, selects payment method
    ↓
useAddOrderItemsMutation() [ordersApiSlice.js]
    ↓
POST /api/orders [orderRoutes.js]
    ↓
protect middleware
    ↓
addOrderItems() [orderController.js]
    ↓
Validate cart items (verify products exist, prices match)
    ↓
Calculate:
      - Item totals
      - Platform fee (10%)
      - Seller revenue (90%)
      - Tax
      - Shipping
      - Grand total
    ↓
Create Order document [orderModel.js]
    ↓
Dual-cluster write via db.js
    ↓
Clear user's cart
    ↓
Emit Socket.IO event "orderCreated" via peerSync.js
      (Notifies seller of new order)
    ↓
Response: { orderId, paymentMethod, ... }
    ↓
Frontend: Redirect to payment page or order confirmation
```

**Files Involved:**
1. **Frontend UI**: `CheckoutPage.jsx`
2. **Form Data**: Shipping address, payment method
3. **API**: `ordersApiSlice.js` → `useAddOrderItemsMutation()`
4. **Route**: `orderRoutes.js` → POST /api/orders
5. **Controller**: `orderController.js` → `addOrderItems()`
6. **Model**: `orderModel.js`
7. **Sync**: `peerSync.js` → Broadcasts to peer backend
8. **Database**: `db.js` → Dual-cluster write

**Key Code (Backend):**
```javascript
// orderController.js - addOrderItems function
const addOrderItems = async (req, res) => {
    const { orderItems, shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;
    
    if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }
    
    // Verify products exist and capture current prices
    for (let item of orderItems) {
        const product = await Product.findById(item.product);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        item.price = product.price; // Use current price
    }
    
    // Calculate totals
    const itemsPrice = orderItems.reduce((sum, item) => sum + item.qty * item.price, 0);
    const taxPrice = Math.round(itemsPrice * 0.15); // 15% tax
    const shippingPrice = itemsPrice > 100 ? 0 : 10; // Free shipping over $100
    const totalPrice = itemsPrice + taxPrice + shippingPrice;
    
    // Create order
    const order = await Order.create({
        user: userId,
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentStatus: 'pending',
        deliveryStatus: 'pending'
    });
    
    // Emit event to notify seller(s)
    req.io.emit('orderCreated', {
        orderId: order._id,
        sellers: orderItems.map(item => item.seller),
        totalPrice: order.totalPrice
    });
    
    res.status(201).json(order);
};
```

#### 4.2 Payment Processing (Chapa Payment Gateway)

**Process Flow:**
```
Frontend (PaymentPage.jsx)
    ↓
User reviews order, selects "Pay with Chapa"
    ↓
useInitializeChapaPayment() [ordersApiSlice.js]
    ↓
POST /api/orders/chapa/init [orderRoutes.js]
    ↓
initializeChapaPayment() [paymentController.js]
    ↓
Generate unique tx_ref (transaction reference)
    ↓
Call Chapa API: Create payment session
    ↓
Chapa returns checkout URL
    ↓
Response: { checkoutUrl, tx_ref, ... }
    ↓
Frontend: Redirect to Chapa checkout URL
    ↓
User completes payment on Chapa
    ↓
Chapa redirects to /callback?tx_ref=...
    ↓
Frontend: POST /api/orders/:orderId/chapa/verify [webhook]
    ↓
verifyChapaPayment() [paymentController.js]
    ↓
Call Chapa API: Verify transaction
    ↓
If successful:
      - Update Order.paymentStatus = 'success'
      - Update Order.isPaid = true
      - Create SellerWalletTransaction (seller gets 90% of sale)
      - Emit "paymentReceived" Socket.IO event
    ↓
Response: { success, order, ... }
    ↓
Frontend: Show "Payment successful" screen
```

**Files:** 
- Frontend: `CheckoutPage.jsx`, `PaymentPage.jsx`
- Backend: `paymentController.js`, `orderRoutes.js`
- External: Chapa payment gateway

#### 4.3 Order Status Updates (Seller Perspective)

**Process Flow:**
```
Seller navigates to Orders page (SellerOrdersPage.jsx)
    ↓
useGetSellerOrdersQuery() [sellersApiSlice.js]
    ↓
GET /api/seller/orders [sellerProductRoutes.js]
    ↓
protectSeller middleware
    ↓
getSellerOrders() [sellerOrderController.js]
    ↓
Query Order model filtered by seller (in orderItems.seller)
    ↓
Response: [ { orderId, items, buyer, totalPrice, status, ... } ]
    ↓
Frontend: Display orders with status badges
    ↓
Seller clicks order to view details
    ↓
Shows buyer info, items, delivery address, payment status
    ↓
Seller clicks "Mark as Preparing"
    ↓
PUT /api/seller/orders/:id/status [sellerProductRoutes.js]
    ↓
updateSellerOrderStatus() [sellerOrderController.js]
    ↓
Update Order.deliveryStatus = 'preparing'
    ↓
Emit Socket.IO event "orderStatusChanged"
    ↓
Buyer sees real-time update on MyOrdersPage
```

**Files:**
- Seller: `pages/seller/SellerOrdersPage.jsx`
- Backend: `sellerOrderController.js`
- Models: `orderModel.js`
- Sync: `peerSync.js` (broadcasts status updates)

#### 4.4 Order Delivery & Tracking

**Process Flow:**
```
Seller ships order, gets tracking number
    ↓
Seller updates order: status = 'out_for_delivery'
    ↓
Seller provides tracking number
    ↓
PUT /api/seller/orders/:id/deliver [sellerOrderController.js]
    ↓
updateOrderToDelivered() [sellerOrderController.js]
    ↓
Updates:
      - Order.deliveryStatus = 'out_for_delivery'
      - Order.trackingNumber = <tracking_num>
      - Order.estimatedDeliveryDate
    ↓
Emits "orderDispatched" event
    ↓
Buyer receives notification on MyOrdersPage
    ↓
Can click "Track Order" to see tracking link
    ↓
Once delivered:
    ↓
System auto-updates Order.deliveryStatus = 'delivered'
    ↓
Buyer can now:
      - Confirm delivery
      - Request refund (within 30 days)
      - Write product review
```

### Use Cases & Scenarios

#### Use Case 4.1: Complete Purchase Flow
**Actor:** Buyer from browsing to order confirmation
**Scenario:**
1. Buyer adds items to cart
2. Clicks "Proceed to Checkout"
3. Fills shipping address form
4. Selects payment method (Chapa)
5. Reviews order:
   - Items: Laptop x1 @ $900
   - Tax: $135
   - Shipping: $0 (free)
   - Total: $1,035
6. Clicks "Place Order"
7. Order created with status = 'pending'
8. Redirected to Chapa payment page
9. Pays via card
10. Returns to app
11. Order confirmation page shown
12. Email sent to buyer
13. Seller receives notification of new order

**Files:**
- `CheckoutPage.jsx` → `orderController.js` → `paymentController.js`
- Order created in both clusters
- Real-time notification via Socket.IO

#### Use Case 4.2: Track Order Progress
**Actor:** Buyer checking order status
**Scenario:**
1. Buyer navigates to "My Orders"
2. Sees list of orders with status badges:
   - "Payment Pending"
   - "Preparing"
   - "Out for Delivery"
   - "Delivered"
3. Clicks on order to see details
4. Can see:
   - Shipping address
   - Estimated delivery date
   - Tracking number (when shipped)
   - Seller contact info
5. System shows timeline of status updates
6. When status changes, page updates in real-time via Socket.IO

**Files:** `pages/orders/MyOrdersPage.jsx` → `orderController.js`

#### Use Case 4.3: Request Refund
**Actor:** Buyer received damaged/wrong product
**Scenario:**
1. Buyer views delivered order
2. Clicks "Request Refund"
3. Fills refund form:
   - Reason (damaged, wrong item, etc.)
   - Description
   - Uploads photos as evidence
4. Submits request
5. PUT /api/orders/:id/refund [orderRoutes.js]
6. requestOrderRefund() [orderController.js]:
   - Creates refund request
   - Sets Order.refundStatus = 'requested'
   - Notifies seller
7. Seller can:
   - Approve refund (money returned to buyer)
   - Reject refund (with reason)
8. Admin can escalate disputes

**Files:**
- `OrderDetailsPage.jsx` (Request form)
- `orderController.js` (Refund logic)
- `sellerOrderController.js` (Seller approval)
- `adminOrderController.js` (Admin escalation)

#### Use Case 4.4: Seller Processing Order
**Actor:** Seller fulfilling orders
**Scenario:**
1. Seller logs into dashboard
2. Navigates to "Orders"
3. Sees 5 new orders (in real-time via Socket.IO)
4. Clicks first order to view details
5. Confirms items, prints shipping label
6. Marks order as "Preparing" (starts 24-hour timer)
7. Prepares package, adds tracking number
8. Marks order as "Out for Delivery"
9. System calculates seller revenue:
   - Order total: $1,035
   - Platform fee (10%): $103.50
   - Seller revenue (90%): $931.50
10. Money added to seller wallet
11. Buyer sees real-time updates on order page

**Files:**
- `pages/seller/SellerOrdersPage.jsx`
- `sellerOrderController.js`
- `sellerWalletTransactionModel.js`
- `peerSync.js` (broadcasts status to peer backend)

### Distributed System Impact

**Order Consistency Across Clusters:**
- When order created on Render:
  - Order document saved to Cluster A
  - Immediately replayed to Cluster B (dual-write)
  - Order ID same on both clusters
  - Socket.IO event emitted to Replit peer backend
  - Seller(s) on Replit receive order notification

- If Cluster B offline during order:
  - Order created on Cluster A
  - Operation queued in SyncQueue
  - Buyer sees "Order created" immediately
  - When Cluster B recovers, order replayed
  - Seller eventually sees order when Cluster B back online

- Payment webhook:
  - Chapa calls /callback endpoint
  - Verifies transaction on both clusters
  - Updates payment status on both
  - Socket.IO broadcasts to all connected clients

---

## 5. Seller Management & Registration

### Overview
Complete seller lifecycle from KYC verification through onboarding to product/order management.

### Related Files

#### Backend Files:
- **`server/routes/sellerRoutes.js`** - Seller auth and account management
- **`server/controllers/sellerController.js`** - Seller registration, login, settings
- **`server/models/sellerModel.js`** - Seller profile schema
- **`server/models/sellerWalletTransactionModel.js`** - Seller earnings/wallet
- **`server/middleware/uploadMiddleware.js`** - KYC document upload handling
- **`server/middleware/authMiddleware.js`** - Seller JWT verification

#### Frontend Files:
- **`client/src/pages/seller/SellerRegister.jsx`** - Seller registration form
- **`client/src/pages/seller/SellerDashboard.jsx`** - Main seller dashboard
- **`client/src/pages/seller/SellerProductsPage.jsx`** - Product management
- **`client/src/pages/seller/SellerOrdersPage.jsx`** - Order management
- **`client/src/store/slices/sellerAuthSlice.js`** - Seller auth state
- **`client/src/store/slices/sellersApiSlice.js`** - Seller API calls

### Functionality Flow

#### 5.1 Seller Registration with KYC

**Process Flow:**
```
Frontend (SellerRegister.jsx)
    ↓
Seller fills form:
    - Name, email, password
    - Shop name, description
    - Bank details
    ↓
Seller uploads KYC documents:
    - National ID card
    - Business license
    - Tax certificate
    ↓
useRegisterSellerMutation() [sellersApiSlice.js]
    ↓
POST /api/seller [sellerRoutes.js]
    ↓
uploadSellerDocs middleware processes uploads via multer
    ↓
registerSeller() [sellerController.js]
    ↓
Validate all fields present
    ↓
Check email not already used
    ↓
Create User document with role='seller'
    ↓
Create Seller document with:
      - shopName
      - businessInfo
      - bankDetails
      - kycDocuments (upload paths)
      - kycStatus = 'pending'
    ↓
Dual-cluster write via db.js
    ↓
Create initial SellerWalletTransaction (balance=$0)
    ↓
Send email: "KYC under review"
    ↓
Response: { seller, token, message: 'Registered, awaiting KYC approval' }
    ↓
Frontend: Redirect to "Awaiting Approval" page
```

**Files Involved:**
1. **Frontend**: `SellerRegister.jsx`
2. **Uploads**: `uploadMiddleware.js` → Multer processes files
3. **API**: `sellersApiSlice.js`
4. **Route**: `sellerRoutes.js` → POST /api/seller
5. **Controller**: `sellerController.js` → `registerSeller()`
6. **Models**: `sellerModel.js`, `userModel.js`
7. **Database**: `db.js` → Dual-cluster write
8. **Email**: `emailService.js` → Registration confirmation

**Key Code (Backend):**
```javascript
// sellerController.js - registerSeller function
const registerSeller = async (req, res) => {
    const { name, email, password, shopName, businessInfo, bankDetails } = req.body;
    
    // Get uploaded file paths from multer
    const { idDocument, licenseDocument, taxDocument } = req.files || {};
    
    // Validation
    if (!name || !email || !password || !shopName) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check duplicate email
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Create user with seller role
    const user = await User.create({
        name,
        email,
        password,
        role: 'seller'
    });
    
    // Create seller profile
    const seller = await Seller.create({
        user: user._id,
        shopName,
        businessInfo,
        bankDetails,
        kycDocuments: {
            idDocument: idDocument?.[0]?.path,
            licenseDocument: licenseDocument?.[0]?.path,
            taxDocument: taxDocument?.[0]?.path
        },
        kycStatus: 'pending', // Admin will review
        kycSubmittedDate: new Date()
    });
    
    // Create initial wallet transaction
    await SellerWalletTransaction.create({
        seller: seller._id,
        amount: 0,
        type: 'initial',
        description: 'Account created'
    });
    
    res.status(201).json({
        user,
        seller,
        token: generateToken(user._id),
        message: 'Registration successful. Please wait for KYC approval.'
    });
};
```

#### 5.2 Seller Login

**Process Flow:**
```
Frontend (SellerLoginScreen.jsx)
    ↓
Seller enters email and password
    ↓
useAuthSellerMutation() [sellersApiSlice.js]
    ↓
POST /api/seller/login [sellerRoutes.js]
    ↓
authSeller() [sellerController.js]
    ↓
Find User with email and role='seller'
    ↓
Verify password using bcrypt.compare()
    ↓
Check KYC status:
      - if 'pending': return "KYC under review"
      - if 'rejected': return "KYC rejected, contact support"
      - if 'approved': Continue
    ↓
Generate JWT token
    ↓
Get Seller document
    ↓
Get SellerWalletTransaction balance
    ↓
Response: { user, seller, wallet, token }
    ↓
Frontend: Store token, redirect to dashboard
```

#### 5.3 Seller Dashboard & Analytics

**Process Flow:**
```
Frontend (SellerDashboard.jsx)
    ↓
protectSeller middleware verifies JWT
    ↓
Fetch multiple data points:
    - useGetSellerOrdersQuery() [Recent orders]
    - useGetSellerProductsQuery() [Product list]
    - useGetSellerWalletQuery() [Earnings]
    - useGetSellerSettingsQuery() [Settings]
    ↓
GET /api/seller/orders [getSellerOrders]
GET /api/seller/products [getSellerProducts]
GET /api/seller/wallet [getSellerWallet]
    ↓
Backend aggregates data:
    - Count pending/delivered orders (past 30 days)
    - Count active products
    - Sum total sales
    - Calculate earnings (sales - platform fee)
    ↓
Response: Dashboard data
    ↓
Frontend: Display in dashboard:
    - Total Orders: 42
    - Active Products: 18
    - Total Earnings: $2,450
    - Revenue This Month: $1,200
    - Status: Approved
    - Wallet Balance: $500
```

### Use Cases & Scenarios

#### Use Case 5.1: Complete Seller Onboarding
**Actor:** Entrepreneur wanting to become seller
**Scenario:**
1. Clicks "Become a Seller" on homepage
2. Fills registration form:
   - Name, email, password
   - Shop name: "TechGear Store"
   - Shop description: "Electronics & gadgets"
   - Bank account details
3. Uploads KYC documents:
   - Passport scan (idDocument)
   - Business license (licenseDocument)
   - Tax certificate (taxDocument)
4. Reads and accepts Terms & Conditions
5. Clicks "Register"
6. System creates:
   - User document with role='seller'
   - Seller document with kycStatus='pending'
   - Initial wallet transaction
7. Confirmation email sent
8. Seller sees "Awaiting KYC Approval" page
9. Admin reviews KYC (see admin functionality)
10. After approval, seller can:
    - List products
    - Manage inventory
    - Receive and fulfill orders

**Files:**
- `pages/seller/SellerRegister.jsx`
- `sellerController.js` → `registerSeller()`
- `uploadMiddleware.js` → Process KYC documents
- `sellerModel.js` → Store seller info

#### Use Case 5.2: Seller Dashboard Overview
**Actor:** Seller checking business metrics
**Scenario:**
1. Seller logs in with email/password
2. Redirected to SellerDashboard.jsx
3. Dashboard displays:
   - Recent Orders (5 pending, 12 delivered this month)
   - Product Summary (18 active, 2 out of stock)
   - Earnings Chart (sales trend)
   - Wallet Balance: $500
   - Store Status: "Approved"
4. Quick actions:
   - "Add New Product" button
   - "View Orders" link
   - "Manage Inventory" link
5. Can click on recent order to process
6. Real-time updates via Socket.IO when new order arrives

**Files:**
- `pages/seller/SellerDashboard.jsx`
- `sellersApiSlice.js` (Multiple API queries)
- `sellerOrderController.js` (Order data)
- `sellerProductController.js` (Product data)

#### Use Case 5.3: Manage Seller Settings
**Actor:** Seller updating business info
**Scenario:**
1. Seller navigates to "Settings"
2. Can update:
   - Shop name, description
   - Bank account details
   - Business address
   - Contact email/phone
3. System saves to Seller document
4. Changes replicated to both clusters
5. Settings reflected on seller profile page (visible to buyers)

**Files:**
- `pages/seller/SellerSettingsPage.jsx`
- `sellerSettingsController.js` → `updateSellerSettings()`
- `sellerModel.js`

#### Use Case 5.4: Seller Wallet & Earnings
**Actor:** Seller checking earnings
**Scenario:**
1. Seller navigates to "Wallet"
2. Shows:
   - Total Balance: $500
   - Pending Balance (from orders not yet delivered): $300
   - Transaction History:
     * Mar 15: Order #1001 paid → +$90 (after 10% fee)
     * Mar 18: Withdrawal → -$200
     * Mar 22: Order #1003 paid → +$81
3. Can request "Withdraw Balance" to bank account
4. Withdrawal processed within 2-3 business days
5. All transactions tracked in SellerWalletTransaction model

**Files:**
- `pages/seller/SellerWalletPage.jsx`
- `sellerController.js` → `getSellerWallet()`
- `sellerWalletTransactionModel.js`

### Distributed System Considerations

**Seller Registration Across Clusters:**
- When seller registers on Render:
  - User and Seller documents created on Cluster A
  - KYC documents uploaded to /uploads directory on Render
  - Dual-write saves to both clusters
  - If Cluster B offline, registration queued
  - Seller can log in once Cluster A has data
  - After Cluster B recovery, documents synced

**Seller Order Notifications:**
- When seller gets new order:
  - Order created on primary cluster
  - Socket.IO event "orderCreated" emitted
  - Event synced to peer backend via `/api/internal/sync`
  - Both backends' Socket.IO connections receive event
  - Seller notification updated in real-time regardless of which backend they're connected to

---

## 6. Admin Functionalities

### Overview
Administrators manage sellers (KYC), users, orders, disputes, finance, and system operations.

### Related Files

#### Backend Files:
- **`server/routes/adminSellerRoutes.js`** - Seller management routes
- **`server/routes/adminUserRoutes.js`** - User management routes
- **`server/routes/adminOrderRoutes.js`** - Order dispute/escalation
- **`server/routes/adminFinanceRoutes.js`** - Financial reports
- **`server/routes/adminAuthRoutes.js`** - Admin login
- **`server/controllers/adminSellerController.js`** - Seller KYC approval, monitoring
- **`server/controllers/adminUserController.js`** - User role management
- **`server/controllers/adminOrderController.js`** - Order dispute resolution
- **`server/controllers/adminFinanceController.js`** - Revenue tracking
- **`server/models/adminSellerActivityModel.js`** - Audit log

#### Frontend Files:
- **`client/src/admin/pages/AdminDashboard.jsx`** - Admin overview
- **`client/src/admin/pages/AdminSellersPage.jsx`** - Seller management
- **`client/src/admin/pages/AdminUsersPage.jsx`** - User management
- **`client/src/admin/pages/AdminOrdersPage.jsx`** - Order disputes
- **`client/src/admin/pages/AdminFinancePage.jsx`** - Financial data

### Functionality Flow

#### 6.1 Admin Login

**Process Flow:**
```
Frontend (AdminLoginScreen.jsx)
    ↓
Admin enters email and password
    ↓
useAdminLoginMutation() [adminAuthSlice.js]
    ↓
POST /api/admin/login [adminAuthRoutes.js]
    ↓
protect middleware + admin check (via authMiddleware.js)
    ↓
authAdminUser() [adminAuthController.js]
    ↓
Find User with role='admin'
    ↓
Verify password
    ↓
Generate JWT token with role claim
    ↓
Response: { user, token }
    ↓
Frontend: Store token, redirect to admin dashboard
```

#### 6.2 Review Seller KYC Documents

**Process Flow:**
```
Frontend (AdminSellersPage.jsx)
    ↓
useGetSellersForAdminQuery() [sellersApiSlice.js]
    ↓
GET /api/admin/sellers [adminSellerRoutes.js]
    ↓
protect middleware + admin check
    ↓
getSellersForAdmin() [adminSellerController.js]
    ↓
Query Seller model filtered by kycStatus='pending'
    ↓
Return sellers with:
      - Shop name
      - KYC submission date
      - Document URLs
      - Business info
    ↓
Response: [ { seller1 }, { seller2 }, ... ]
    ↓
Frontend: Display sellers list
    ↓
Admin clicks on seller to review
    ↓
Shows:
      - All KYC documents (downloadable/viewable)
      - Business information
      - Previous notes
    ↓
Admin can:
      - Approve seller (kycStatus='approved')
      - Reject seller (kycStatus='rejected', provide reason)
      - Request additional documents
      - Add notes for audit trail
    ↓
useUpdateSellerStatusByAdminMutation()
    ↓
PATCH /api/admin/sellers/:id/status [adminSellerRoutes.js]
    ↓
updateSellerStatusByAdmin() [adminSellerController.js]
    ↓
Update Seller.kycStatus and Seller.kycApprovalDate
    ↓
Create AdminSellerActivityLog entry:
      - Admin ID
      - Action: 'approved'/'rejected'
      - Timestamp
    ↓
Send email to seller:
      - If approved: "Congratulations, you can now list products"
      - If rejected: "Your KYC was rejected. Reason: [reason]. Contact support."
    ↓
Save to both clusters
    ↓
Seller sees status update when logging in
```

**Files Involved:**
1. **Frontend**: `admin/pages/AdminSellersPage.jsx`
2. **API**: `sellersApiSlice.js` (Admin endpoints)
3. **Routes**: `adminSellerRoutes.js`
4. **Controller**: `adminSellerController.js`
5. **Model**: `sellerModel.js`, `adminSellerActivityModel.js`
6. **Email**: `emailService.js`

#### 6.3 Monitor Seller Activity

**Process Flow:**
```
Frontend (AdminSellersPage.jsx - Seller Detail View)
    ↓
Admin clicks on approved seller to monitor
    ↓
useGetSellerActivityForAdminQuery()
    ↓
GET /api/admin/sellers/:id/activity [adminSellerRoutes.js]
    ↓
getSellerActivityForAdmin() [adminSellerController.js]
    ↓
Fetch AdminSellerActivityLog entries for this seller
    ↓
Also fetch:
      - Seller transactions (for revenue)
      - Seller products (quality check)
      - Seller orders (dispute rate)
      - Seller reviews (seller rating)
    ↓
Response: { activities, transactions, products, orders, rating }
    ↓
Frontend displays:
      - Activity timeline
      - Monthly revenue graph
      - Product quality metrics
      - Order fulfillment rate
      - Customer reviews/ratings
    ↓
Can trigger actions:
      - Suspend seller
      - Flag seller for suspicious activity
      - Request seller documents update
      - Message seller
```

#### 6.4 Resolve Order Disputes

**Process Flow:**
```
Buyer requests refund (see Order Processing Use Case 4.3)
    ↓
Seller rejects refund request
    ↓
Buyer escalates to admin
    ↓
Admin receives notification
    ↓
Frontend (AdminOrdersPage.jsx)
    ↓
useGetDisputedOrdersQuery()
    ↓
GET /api/admin/orders/disputed [adminOrderRoutes.js]
    ↓
getDisputedOrders() [adminOrderController.js]
    ↓
Query Order model where refundStatus='escalated'
    ↓
Response: List of disputed orders
    ↓
Admin clicks order to view details
    ↓
Shows:
      - Order items and pricing
      - Buyer's refund reason and photos
      - Seller's rejection reason
      - Chat/messages between buyer and seller
    ↓
Admin can:
      - Approve refund (force refund to buyer)
      - Reject refund (support seller)
      - Request more information
      - Assign case to support team
    ↓
Decision saved to Order.adminResolution
    ↓
Both buyer and seller notified
    ↓
If refund approved:
      - Money returned to buyer
      - Seller rating may be affected
      - Incident logged
```

#### 6.5 Financial Reports & Analytics

**Process Flow:**
```
Frontend (AdminFinancePage.jsx)
    ↓
useGetFinanceStatsQuery() [platformApiSlice.js]
    ↓
GET /api/admin/finance [adminFinanceRoutes.js]
    ↓
getFinanceStats() [adminFinanceController.js]
    ↓
Aggregate across all orders:
      - Total sales (sum all totalPrice)
      - Platform fees collected (sum of 10% cuts)
      - Seller payouts (sum of transfers)
      - Tax collected
      - Period-over-period growth
    ↓
Response: { totalSales, platformFees, sellerPayouts, ... }
    ↓
Frontend displays:
      - Revenue charts (daily/monthly)
      - Top sellers by sales
      - Category breakdown
      - Payment method breakdown
      - Refund statistics
    ↓
Can export data to CSV
    ↓
useExportFinanceDataMutation()
    ↓
GET /api/admin/finance/export [adminFinanceRoutes.js]
    ↓
exportFinanceData() [adminFinanceController.js]
    ↓
Generate CSV file with all transactions
    ↓
Response: CSV file download
```

### Use Cases & Scenarios

#### Use Case 6.1: Approve New Seller
**Actor:** Admin reviewing seller KYC
**Scenario:**
1. Admin logs into admin panel
2. Navigates to "Sellers" → "Pending KYC"
3. Sees list of 3 sellers awaiting approval
4. Clicks on "TechGear Store"
5. Views seller details:
   - Shop name: TechGear Store
   - Owner: Ahmed Hassan
   - Email: ahmed@techgear.com
   - Submission date: Mar 15, 2024
6. Downloads and reviews KYC documents:
   - National ID (verified)
   - Business license (verified)
   - Tax certificate (verified)
7. Reads business description: "Electronics and gadgets retailer"
8. Checks previous company history: Clean
9. Clicks "Approve"
10. Adds note: "Documents verified. Good to go."
11. System:
    - Updates kycStatus='approved'
    - Creates audit log entry
    - Sends email to seller
    - Seller can now list products
12. Seller appears in "Approved Sellers" list

**Files:**
- `admin/pages/AdminSellersPage.jsx`
- `adminSellerController.js` → `updateSellerStatusByAdmin()`
- `adminSellerActivityModel.js` (audit log)

#### Use Case 6.2: Handle Disputed Order
**Actor:** Admin resolving refund dispute
**Scenario:**
1. Buyer requests refund for damaged laptop
2. Seller rejects (claims no damage when shipped)
3. Buyer escalates to admin
4. Admin views dispute on AdminOrdersPage
5. Reviews:
   - Order details (Laptop, $900, paid)
   - Buyer's claim: "Received with cracked screen"
   - Buyer's photos: 2 images showing damage
   - Seller's claim: "Item was perfect when shipped"
   - Chat history between parties
6. Admin leans toward buyer (clear photos of damage)
7. Clicks "Approve Refund"
8. Adds note: "Damage evident in buyer photos"
9. System:
    - Refunds $900 to buyer wallet
    - Deducts $900 from seller balance
    - Incident logged
    - Seller rating may decrease
    - Both notified
10. Case closed

**Files:**
- `admin/pages/AdminOrdersPage.jsx`
- `adminOrderController.js` (dispute resolution)
- `orderModel.js` (refund logic)

#### Use Case 6.3: Monitor Platform Finance
**Actor:** Manager checking daily revenue
**Scenario:**
1. Manager logs into admin panel
2. Navigates to "Finance"
3. Dashboard shows:
   - Today's Revenue: $2,450
   - Platform Fees Today: $245 (10% of sales)
   - Seller Payouts Pending: $8,300
   - Tax Collected: $567
4. Views monthly revenue graph (upward trend)
5. Checks top 5 sellers by sales:
   - TechGear Store: $12,500
   - Fashion Hub: $8,300
   - Home & Garden: $5,200
   - etc.
6. Filters by payment method:
   - Chapa: 75% of transactions
   - Card: 20%
   - Wallet: 5%
7. Exports last month's data to CSV
8. Data shows growth of 15% month-over-month

**Files:**
- `admin/pages/AdminFinancePage.jsx`
- `adminFinanceController.js` → `getFinanceStats()`, `exportFinanceData()`
- Aggregation across `orderModel.js` documents

#### Use Case 6.4: Suspend Malicious Seller
**Actor:** Admin dealing with seller fraud
**Scenario:**
1. Multiple buyer complaints about fake products
2. Admin flags seller for review
3. Investigates:
   - 20 orders in past month
   - 15 refund requests
   - 2-star average rating
   - 5 fraud reports
4. Decides to suspend seller
5. Clicks "Suspend Seller" button
6. Provides reason: "Selling counterfeit products"
7. System:
    - Sets Seller.status = 'suspended'
    - Hides all seller products from marketplace
    - Prevents seller from listing new products
    - Prevents seller from receiving new orders
    - Existing orders continue (buyers get them)
    - Seller receives email: "Your account has been suspended. Reason: [reason]"
8. Seller can appeal by contacting support

**Files:**
- `adminSellerController.js` → `suspendSeller()` (custom function)
- `sellerModel.js` (status field)
- Email notification

### Distributed System Considerations

**Admin Actions Across Clusters:**
- When admin approves seller KYC on Render:
  - Seller document updated on Cluster A
  - Dual-write immediately replayed to Cluster B
  - Audit log entry created on both clusters
  - Email sent to seller
  - Seller logs in hours later, sees approved status (from either cluster)

- Admin financial reports:
  - Query aggregates across all orders
  - Uses read preference if available to use secondary for reports (not implemented but possible)
  - Data consistent whether querying Cluster A or B (eventual consistency achieved)

---

## 7. Distributed System Architecture

### Overview
The distributed architecture enables high availability, fault tolerance, and eventual consistency across multiple independent components.

### Related Files

#### Core Distributed Components:
- **`server/config/db.js`** - Dual-cluster management, dual-write logic, SyncQueue integration
- **`server/config/connectionManager.js`** - Mongoose connection pooling for both clusters
- **`server/models/syncQueueModel.js`** - Queue model for operations to replay
- **`server/utils/peerSync.js`** - Backend-to-backend communication
- **`server/middleware/peerUploadFallback.js`** - Upload failover
- **`server/index.js`** - Server initialization with Socket.IO

#### Frontend Distributed Logic:
- **`client/src/utils/networkConfig.js`** - Peer node tracking, health checks, failover
- **`client/src/store/slices/apiSlice.js`** - RTK Query configuration with backend rotation
- **`client/src/utils/mediaUrl.js`** - Image URL rewriting for active backend

### Distributed System Architecture Details

#### 7.1 Dual-Cluster Synchronization Mechanism

**When Both Clusters Are Online:**

```
Frontend request
    ↓
Backend (Render or Replit) receives request
    ↓
Controller calls Model.create/update/delete
    ↓
db.js dual-write logic intercepts:
    1. Execute operation on Cluster A (primary)
    2. If successful, immediately execute on Cluster B
    3. Both complete before returning to controller
    ↓
Controller sends response
    ↓
Frontend receives consistent data
    ↓
Both clusters in perfect sync
```

**Code Structure (db.js):**
```javascript
// Simplified dual-write logic
async function executeTaskOnConnection(clusterUri, task) {
    const connection = getConnectionForUri(clusterUri);
    return await task(connection);
}

// When saving a document
userSchema.pre('save', async function(next) {
    // If not marked to skip Cluster B
    if (!this._skipClusterBSync) {
        try {
            // Execute on Cluster B as well
            await executeTaskOnConnection(process.env.MONGO_URI_B, async (conn) => {
                return await conn.model('User').updateOne(
                    { _id: this._id },
                    this.toObject()
                );
            });
        } catch (error) {
            // Failed to write to Cluster B
            // Queue operation in SyncQueue on Cluster A
            await queueForLaterSync({
                operation: 'save',
                modelName: 'User',
                documentId: this._id,
                data: this.toObject()
            });
        }
    }
    next();
});
```

#### 7.2 SyncQueue: Handling Cluster B Failures

**When Cluster B is Offline:**

```
Database operation occurs
    ↓
Try to write to both clusters
    ↓
Cluster A succeeds
    ↓
Cluster B fails (no connection)
    ↓
Operation caught in catch block
    ↓
Create SyncQueue document:
    {
        _id: ObjectId,
        operationType: 'create',
        modelName: 'User',
        payload: { name, email, password, ... },
        status: 'pending',
        lockTimestamp: null,
        createdAt: Date.now(),
        attempts: 0
    }
    ↓
Return success to client
    (Database operation succeeded on available cluster)
    ↓
Client sees consistent response
```

**When Cluster B Recovers:**

```
startReconnectWatcher() detects Cluster B online
    ↓
Query SyncQueue for pending operations:
    db.collection('syncQueue').find({ status: 'pending' })
    ↓
For each pending operation:
    1. Try to claim lock (atomic operation)
    2. Set lockTimestamp to now + LOCK_TIMEOUT_MS
    3. Only one worker can claim each item
    ↓
Worker processes claimed items:
    1. Retrieve operation details
    2. Re-execute on Cluster B
    3. Mark status = 'completed'
    ↓
Next worker process (if different backend) skips completed items
    (due to distributed lock timeout)
    ↓
Cluster B now has all missed operations
    ↓
Full consistency restored
```

**Code Structure (db.js):**
```javascript
async function startReconnectWatcher() {
    setInterval(async () => {
        try {
            // Test Cluster B connectivity
            await mongoose.connection.useDb(process.env.MONGO_URI_B).getClient().admin().ping();
            
            // Cluster B is online, start replay
            await replaySyncQueue();
        } catch (error) {
            // Cluster B still offline
        }
    }, 5000); // Check every 5 seconds
}

async function replaySyncQueue() {
    const queue = db.collection('syncQueue');
    const pendingOps = await queue.find({ status: 'pending' }).toArray();
    
    for (const op of pendingOps) {
        // Try to claim lock
        const lockResult = await queue.updateOne(
            { _id: op._id, lockTimestamp: { $eq: null } },
            {
                $set: {
                    lockTimestamp: new Date(Date.now() + LOCK_TIMEOUT_MS),
                    lockedBy: WORKER_ID
                }
            }
        );
        
        if (lockResult.modifiedCount === 0) {
            continue; // Another worker claimed this item
        }
        
        try {
            // Execute operation on Cluster B
            const result = await executeOnClusterB(op.operation, op.modelName, op.payload);
            
            // Mark as completed
            await queue.updateOne(
                { _id: op._id },
                { $set: { status: 'completed', completedAt: new Date() } }
            );
        } catch (error) {
            // Mark as failed for retry
            await queue.updateOne(
                { _id: op._id },
                { 
                    $set: { lockTimestamp: null, lockedBy: null },
                    $inc: { attempts: 1 }
                }
            );
        }
    }
}
```

#### 7.3 Frontend Failover Logic

**File: `networkConfig.js`**

**Initialization:**
```javascript
// Initialize peer nodes from environment
const PEER_NODES = [
    process.env.VITE_API_BASE_URL,      // Primary: Render
    process.env.VITE_FALLBACK_API_URL   // Secondary: Replit
].filter(Boolean);

// Track health of each node
const nodeHealthMap = new Map(); // { url: { isDown: false, downSince: null } }

// Get active backend for this session
function getActiveBackendUrl() {
    const stored = sessionStorage.getItem('activeBackendUrl');
    if (stored && isHealthy(stored)) {
        return stored;
    }
    
    // Find first healthy node
    for (const node of PEER_NODES) {
        if (isHealthy(node)) {
            sessionStorage.setItem('activeBackendUrl', node);
            return node;
        }
    }
    
    return PEER_NODES[0]; // Fallback to primary
}

function isHealthy(url) {
    const health = nodeHealthMap.get(url);
    if (!health) return true; // Unknown nodes considered healthy
    
    if (!health.isDown) return true;
    
    // Check if 30-second recovery window has passed
    if (Date.now() - health.downSince > 30000) {
        // Reset health status
        nodeHealthMap.delete(url);
        return true;
    }
    
    return false;
}
```

**Failure Detection (in RTK Query):**
```javascript
// In apiSlice.js queryErrorHandling
const queryErrorHandling = (error) => {
    // Network error or timeout
    if (error.status === undefined || error.code === 'ECONNABORTED') {
        rotateBackendNode(getActiveBackendUrl());
    }
};

function rotateBackendNode(currentUrl) {
    // Mark current node as down
    nodeHealthMap.set(currentUrl, {
        isDown: true,
        downSince: Date.now()
    });
    
    // Find next healthy node
    const nextNode = PEER_NODES.find(node => node !== currentUrl && isHealthy(node));
    
    if (nextNode) {
        sessionStorage.setItem('activeBackendUrl', nextNode);
        window.dispatchEvent(new CustomEvent('backendRotated', { detail: nextNode }));
    }
}
```

**Usage in Queries:**
```javascript
// RTK Query automatically includes active backend URL in all requests
const apiSlice = createApi({
    baseQuery: async (args, api, extraOptions) => {
        const activeUrl = getActiveBackendUrl();
        return axios.get(`${activeUrl}${args.url}`, {
            timeout: 5000, // 5-second timeout
            ...extraOptions
        });
    },
    // ... rest of config
});
```

#### 7.4 Backend-to-Backend Synchronization

**File: `peerSync.js` - Inter-Backend Communication**

**Scenario: Order created on Render backend**

```javascript
// In orderController.js, emitting Socket.IO event
req.io.emit('orderCreated', {
    orderId: '12345',
    buyers: ['user1', 'user2'],
    sellers: ['seller1'],
    totalPrice: 1000
});
```

**Behind the scenes (`peerSync.js`):**
```javascript
function emitToAll(io, event, payload) {
    // 1. Emit to all local Socket.IO clients on THIS backend
    io.emit(event, payload);
    
    // 2. Send to peer backend(s) via HTTP
    const peerBackends = [PEER_URL].filter(url => url !== process.env.BACKEND_URL);
    
    for (const peerUrl of peerBackends) {
        axios.post(`${peerUrl}/api/internal/sync`, {
            event,
            payload,
            timestamp: Date.now()
        }, {
            headers: {
                'Internal-Secret': process.env.INTERNAL_SECRET
            }
        }).catch(err => {
            // Peer temporarily unreachable, will re-emit when reconnects
            console.log(`Failed to sync event to ${peerUrl}`);
        });
    }
}
```

**On peer backend (Replit receiving from Render):**
```javascript
// POST /api/internal/sync endpoint
router.post('/api/internal/sync', (req, res) => {
    // Verify authentication
    if (req.headers['internal-secret'] !== process.env.INTERNAL_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { event, payload } = req.body;
    
    // Re-emit to all local clients on THIS backend
    io.emit(event, payload);
    
    res.json({ success: true });
});
```

**Result:**
- Render backend creates order
- Emits to all Render clients: "Order created"
- Sends HTTP POST to Replit: `/api/internal/sync` with event data
- Replit receives sync request
- Replit emits to all Replit clients: "Order created"
- All buyers see order notification on both backends

#### 7.5 Upload Failover

**File: `peerUploadFallback.js` - File Upload Redundancy**

**Scenario: Seller uploads product image, primary backend fails**

```javascript
// uploadRoutes.js with fallback
router.post('/upload', uploadMiddleware.single('file'), peerUploadFallback, (req, res) => {
    // If we get here, upload succeeded on this backend
    res.json({ filename: req.file.filename });
});

// peerUploadFallback.js middleware
async function peerUploadFallback(req, res, next) {
    // If file already uploaded to this backend, continue
    if (req.file) {
        return next();
    }
    
    // Primary backend failed to save file
    // Proxy upload to peer backend
    try {
        const peerUrl = getPeerBackendUrl();
        const response = await proxyUploadToPeer(req.file, peerUrl);
        
        // Rewrite request to appear as if uploaded locally
        req.file.filename = response.filename;
        req.file.path = `http://${peerUrl}/uploads/${response.filename}`;
        
        next();
    } catch (error) {
        res.status(500).json({ error: 'Upload failed on both backends' });
    }
}
```

### Use Cases & Scenarios

#### Use Case 7.1: Cluster B Becomes Unavailable Mid-Operation

**Scenario:** Two backend nodes running, Cluster B goes offline

1. Seller creates product with 3 images
2. Request sent to Render backend (active backend)
3. Product document creation:
   - Saves to Cluster A: ✓ Success
   - Tries to save to Cluster B: ✗ Network timeout
4. Product operation caught in catch block
5. Operation queued in SyncQueue on Cluster A
6. Response sent to seller: "Product created successfully"
7. Seller sees product in inventory
8. Buyers can see product (served from Cluster A)
9. 30 minutes later, Cluster B comes back online
10. startReconnectWatcher() detects Cluster B online
11. Queued product operation replayed:
    - Product document replayed to Cluster B
    - Images replayed to Cluster B
12. Both clusters now have identical product
13. Complete consistency restored

**Files Involved:**
- `db.js` (dual-write logic, queue operation)
- `syncQueueModel.js` (queue storage)
- `startReconnectWatcher()` (replay logic)

#### Use Case 7.2: Primary Backend Node Fails During User Interaction

**Scenario:** Buyer adding product to cart, Render backend crashes

1. Buyer on homepage viewing products
2. Clicks "Add to Cart" on laptop ($900)
3. Frontend sends POST /api/users/cart to activeBackendUrl (Render)
4. Render backend is unreachable (crashed)
5. Request times out after 5 seconds
6. RTK Query catch handler invoked
7. `rotateBackendNode('https://render.com')` called
8. nodeHealthMap.set('https://render.com', { isDown: true, downSince: now })
9. Frontend finds Replit healthy
10. sessionStorage.activeBackendUrl = 'https://replit.com'
11. Window event 'backendRotated' dispatched
12. Toast notification: "Backend connection issue, retrying..."
13. Buyer clicks "Add to Cart" again
14. Request sent to Replit backend (secondary)
15. Replit backend processes add-to-cart:
    - Gets user from Cluster A (primary) or Cluster B
    - Adds to cart
    - Saves to both clusters (Cluster A and B)
16. Response: "Added to cart"
17. Buyer unaware of backend failure
18. Session continues seamlessly on Replit

**Files Involved:**
- `networkConfig.js` (health tracking, rotation)
- `apiSlice.js` (request error handling)
- Both MongoDB clusters (data replication ensures consistency)

#### Use Case 7.3: Both Clusters Temporarily Unavailable

**Scenario:** Network issue prevents both MongoDB clusters from responding

1. Backend trying to save order
2. Cluster A: Timeout trying to connect
3. Cluster B: Timeout trying to connect
4. Order operation fails
5. Error logged: "Both clusters unavailable"
6. Response to client: "Service unavailable, please retry"
7. Backend continues running (can still serve reads from cache if implemented)
8. SyncQueue operations paused (can't queue on offline Cluster A)
9. 2 minutes later, network recovered
10. Backend reconnects to both clusters
11. Queue replay resumes
12. Pending operations from memory are re-attempted

**Mitigation:** This is a complete outage scenario. Handled by:
- Network redundancy (different cloud providers)
- Health monitoring and alerting
- Disaster recovery procedures

---

## Summary: File Interconnections

### Authentication Flow:
```
Frontend: RegisterScreen.jsx
    ↓
API: usersApiSlice.js (useRegisterMutation)
    ↓
Route: userRoutes.js (POST /api/users/register)
    ↓
Controller: authController.js (registerUser)
    ↓
Model: userModel.js
    ↓
Database: db.js (dual-cluster write)
    ↓
Sync: peerSync.js (broadcast new user event)
```

### Order Processing Flow:
```
Frontend: CheckoutPage.jsx
    ↓
API: ordersApiSlice.js (useAddOrderItemsMutation)
    ↓
Route: orderRoutes.js (POST /api/orders)
    ↓
Controller: orderController.js (addOrderItems)
    ↓
Model: orderModel.js
    ↓
Database: db.js (dual-cluster write)
    ↓
Sync: peerSync.js (emit orderCreated event)
    ↓
Payment: paymentController.js (Chapa integration)
    ↓
Wallet: sellerWalletTransactionModel.js (update seller balance)
```

### Distributed System Flow:
```
Any operation (User, Product, Order)
    ↓
Controller executes
    ↓
Model.save() called
    ↓
db.js dual-write intercepts:
    - Write to Cluster A (primary)
    - Write to Cluster B (if available)
    - If Cluster B fails, queue in SyncQueue
    ↓
startReconnectWatcher() monitors Cluster B
    ↓
If Cluster B recovers:
    - Replay queued operations
    - Restore full consistency
    ↓
peerSync.js broadcasts events
    ↓
Both backends' Socket.IO emit to clients
    ↓
Frontend receives real-time updates
```

---

## Key Takeaways

1. **Authentication**: Uses JWT tokens, email verification for password reset, Google OAuth integration
2. **Product Management**: Separate flows for buyers (search/filter) and sellers (CRUD)
3. **Cart**: Local state in Redux + persistent storage in User model
4. **Orders**: Complete lifecycle with payment integration (Chapa), dispute resolution
5. **Sellers**: Complete onboarding with KYC, wallet management, order processing
6. **Admin**: Full platform governance including KYC approval, dispute resolution, financial reporting
7. **Distributed System**: Dual clusters with SyncQueue, frontend failover, backend-to-backend sync

Each functionality integrates seamlessly with the distributed architecture, ensuring data consistency and high availability across multiple failure scenarios.
