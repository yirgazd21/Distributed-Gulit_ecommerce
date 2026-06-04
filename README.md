# Gulit E-Commerce Platform

Full-stack multi-role marketplace application with separate buyer, seller, and admin experiences.

## What This Project Is
Gulit is an e-commerce platform built around three operational surfaces:

- Buyer storefront: browse products, manage cart and checkout, place and track orders.
- Seller workspace: register with KYC, manage products, monitor orders, wallet, support, and settings.
- Admin control room: seller review, user management, order/dispute monitoring, support desk, finance, and system announcements.

The repository is organized as a frontend (`client`) and backend (`server`) application.

## Core Capabilities
### Buyer
- Account registration/login (email/password and Google where configured).
- Product catalog, search, category browsing, product detail and ratings.
- Cart, shipping, payment selection, place-order flow.
- Order history and profile updates.
- Password reset via email flow.

### Seller
- Seller onboarding with KYC document upload.
- Authentication (email/password and Google login).
- Seller dashboard with products, orders, wallet, inbox, and settings.
- Seller-side order delivery updates.
- Seller support ticket and thread reply workflow.
- Seller password reset via email flow.

### Admin
- Secure admin login and admin password reset.
- Dashboard metrics (users, sellers, risk, revenue pulse).
- Seller lifecycle controls (approve/suspend/notes/activity).
- User management and role updates.
- Orders and disputes queue.
- Finance overview and CSV export.
- Support inbox operations and broadcast messaging.
- Platform update publishing and status control.

## Tech Stack
### Frontend (`client`)
- React 19 + Vite 7
- React Router
- Redux Toolkit + RTK Query
- Tailwind CSS v4
- React Toastify

### Backend (`server`)
- Node.js + Express 5
- MongoDB + Mongoose
- JWT auth (`Authorization: Bearer <token>`)
- Multer for uploads
- Email delivery through SendGrid or SMTP

## Architecture Overview
- `client` consumes REST APIs from `server`.
- API base URL is currently set in `client/src/store/slices/apiSlice.js` as `http://localhost:3000`.
- Auth is token-based; separate buyer/seller/admin auth slices exist on the frontend.
- Role-aware route protection exists on both frontend and backend.
- Uploaded files are served from `/uploads`.

## Repository Structure
```text
gulit-ecomerce/
  client/                      # React + Vite frontend
    src/
      pages/                   # Buyer and seller pages
      admin/                   # Admin pages, components, slices
      components/              # Shared UI and layouts
      store/slices/            # RTK Query + auth/cart slices
      context/                 # Theme context
  server/                      # Express backend
    controllers/               # Business logic
    routes/                    # REST route modules
    models/                    # Mongoose models
    middleware/                # Auth and upload middleware
    utils/                     # Email + Google helpers
    uploads/                   # Uploaded docs/images (runtime)
```

## Getting Started
### Prerequisites
- Node.js 18+ (Node.js 20 recommended)
- npm 9+
- MongoDB instance (local or cloud)

### 1) Install Dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 2) Configure Environment Variables
Create `server/.env`:

```env
PORT=3000
DATABASE_URL=mongodb://127.0.0.1:27017/gulit
JWT_SECRET=replace-with-a-strong-secret

# Password reset URLs (frontend routes)
BUYER_RESET_URL=http://localhost:5173/reset-password
SELLER_RESET_URL=http://localhost:5173/seller/reset-password
ADMIN_RESET_URL=http://localhost:5173/admin/reset-password

# Google auth (server-side token audience validation)
GOOGLE_CLIENT_ID=your-google-client-id

# Email transport (use ONE strategy)
# Option A: SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# Option B: SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=
```

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3) Run the Applications
Backend:
```bash
cd server
npm run dev
```

Frontend:
```bash
cd client
npm run dev
```

### 4) Open in Browser
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## API Domain Map
- `/api/users` - Buyer auth/profile/password reset
- `/api/products` - Product listing/details/reviews
- `/api/orders` - Buyer orders and payment/delivery updates
- `/api/upload` - Product image uploads
- `/api/sellers` - Seller auth, wallet, settings, orders, support
- `/api/sellers/products` - Seller product CRUD
- `/api/admin/auth` - Admin auth/profile/dashboard stats
- `/api/admin/sellers` - Seller review, details, exports, activity
- `/api/admin/users` - User listing and role update
- `/api/admin/orders` - Order/dispute queue operations
- `/api/admin/finance` - Finance overview and export
- `/api/admin/support` - Admin support inbox operations
- `/api/admin/system` - Platform update management
- `/api/platform/updates` - Active announcements feed

## First Admin Account (Development)
Admin login requires a user with `role: "admin"`.

For local development you can create one through the registration endpoint:

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Admin User",
    "email":"admin@example.com",
    "password":"admin123",
    "role":"admin"
  }'
```

Then sign in from `/admin/login`.

## Theme Support
- Global light/dark theme context exists in `client/src/context/ThemeContext.jsx`.
- Theme toggles are integrated in buyer, seller, and admin interfaces.
- Theme preference is persisted in local storage.

## Uploads and Media
- Seller KYC upload fields: `idCardImage`, `merchantLicenseImage`, `taxReceiptImage`.
- Product upload route accepts multiple images under `images` (up to 6).
- Static file serving is enabled via `/uploads`.

## Useful Development Notes
- Frontend API URL is hardcoded in `client/src/store/slices/apiSlice.js`.
  - Update `BASE_URL` for non-local environments.
- The server currently enables CORS with default permissive behavior.
  - Lock this down before production.
- There is no root workspace script; run frontend and backend in separate terminals.

## Build
Frontend production build:
```bash
cd client
npm run build
```

## Deployment Checklist
- Set all production environment variables securely.
- Use a strong `JWT_SECRET`.
- Restrict CORS origins.
- Serve uploads from durable storage.
- Put backend behind TLS and reverse proxy.
- Update frontend API base URL.

## License
No explicit license file is currently provided in this repository.
