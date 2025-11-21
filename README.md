# BLCM - Sales & Inventory Management System

A comprehensive cross-platform MERN stack application for managing sales, inventory, suppliers, and generating reports.

## Features

### 1. Login Authentication
- Secure login with username and password
- Password requirements: uppercase, lowercase, numbers, and special characters
- Account locking after 3 failed login attempts (30-minute lock)
- Admin can reset locked accounts

### 2. Supplier Management
- Add and update supplier records (Admin only)
- Store company name, contact details, and product categories
- View all suppliers

### 3. Role Management
- Role-based access control (Admin, Staff, Supplier)
- Admin: Full system access
- Staff/Supplier: Limited operational access

### 4. Product Management
- Add, update, and categorize products (Admin only)
- Link products to suppliers
- Track stock quantity and set low stock thresholds
- View all products

### 5. Sales Processing Module
- Process sales transactions (Supplier/Staff)
- Add customer details
- Select products and quantities
- Apply discounts and taxes
- Multiple payment methods (cash, card, mobile payment)
- Automatic inventory updates
- Generate digital receipts

### 6. Inventory Tracking Module
- Real-time stock monitoring
- Low stock alerts
- Out of stock indicators
- Update stock levels (Admin only)
- Inventory summary dashboard

### 7. Report Generation and Analytics
- Sales reports with date range filtering
- Inventory reports with category breakdown
- Revenue trends visualization
- Top-selling products analysis

### 8. Sales Insights
- Comprehensive sales performance metrics
- Revenue trends and charts
- Top-selling products analysis
- Visual data summaries

## Tech Stack

### Backend
- Node.js (ES Modules) with Express.js
- MongoDB with Mongoose (optimized connection pooling)
- JWT for authentication (HTTP-only cookies)
- bcryptjs for password hashing
- express-validator for input validation
- express-rate-limit for API protection
- cookie-parser for cookie management
- CORS with credentials support

### Frontend
- React 18 with React Router v6
- Vite 5 for build tooling and development server
- Tailwind CSS for styling
- Axios for API calls (with 90s timeout for Render cold starts)
- React Hook Form for form management
- Recharts for data visualization
- Sonner for toast notifications
- jsPDF with jspdf-autotable for PDF generation
- date-fns for date manipulation
- React Icons for iconography
- React Select for enhanced select inputs
- Lazy loading and code splitting for optimized performance

## Project Structure

```
BLCM/
├── backend/
│   ├── models/          # MongoDB models (User, Product, Sale, Supplier, Category)
│   ├── controllers/     # Business logic controllers
│   ├── routes/          # API routes (auth, users, suppliers, products, categories, sales, inventory, reports)
│   ├── middleware/      # Authentication & authorization
│   ├── utils/           # Utility functions (generateToken, generateSaleNumber, validationHandler)
│   ├── createAdmin.js   # Script to create initial admin user
│   ├── server.js        # Express server entry point (ES Modules)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (Layout, ProtectedRoute, ConfirmModal, InputModal, Pagination)
│   │   ├── context/     # React context (AuthContext)
│   │   ├── pages/       # Page components (Login, Dashboard, Sales, Products, Categories, Inventory, Reports, Users, Profile, Suppliers)
│   │   ├── utils/       # Utility functions (date formatting, currency formatting)
│   │   ├── App.jsx      # Main app component with lazy loading
│   │   ├── main.jsx     # React entry point
│   │   └── index.css    # Global styles
│   ├── public/          # Static assets (favicon, images)
│   ├── dist/            # Production build output
│   ├── vite.config.js   # Vite configuration with code splitting
│   ├── tailwind.config.js
│   ├── vercel.json      # Vercel deployment configuration (SPA routing)
│   └── package.json
├── README.md
└── VERCEL_FRONTEND_SETUP.md  # Deployment documentation
```

### Backend Architecture (MVC Pattern)

The backend follows a clean MVC (Model-View-Controller) architecture:

- **Models** (`/models`): MongoDB schemas and models
- **Controllers** (`/controllers`): Business logic and request handling
- **Routes** (`/routes`): Route definitions and validation middleware
- **Middleware** (`/middleware`): Authentication, authorization, and other middleware
- **Utils** (`/utils`): Helper functions and utilities

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/blcm
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional for local development):
```env
VITE_API_URL=http://localhost:5000/api
```

**Note:** The `VITE_API_URL` can be omitted for local development as the Vite proxy in `vite.config.js` will handle API requests. However, it's required for production deployments (e.g., Vercel).

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000` (configured in vite.config.js). The Vite dev server includes a proxy that forwards `/api` requests to `http://localhost:5000`.

## Initial Setup

### Create Admin User

A script is provided to create the initial admin user. Run it from the backend directory:

```bash
cd backend
node createAdmin.js
```

The script will:
- Connect to MongoDB using the `MONGODB_URI` from your `.env` file
- Check if an admin user already exists
- Create a new admin user if one doesn't exist

Default admin credentials:
- Username: `admin`
- Password: `Admin@123`
- Email: `admin@blcm.com`
- Role: `admin`

**⚠️ IMPORTANT: Change the default password after first login!**

**Note:** The password is automatically hashed by the User model's pre-save hook, so you don't need to hash it manually.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/reset-account/:userId` - Reset locked account (Admin)

### Users
- `GET /api/users` - Get all users (Admin)
- `POST /api/users` - Create user (Admin)
- `PUT /api/users/:id` - Update user (Admin)

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get single supplier
- `POST /api/suppliers` - Create supplier (Admin)
- `PUT /api/suppliers/:id` - Update supplier (Admin)
- `DELETE /api/suppliers/:id` - Delete supplier (Admin)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get single sale
- `POST /api/sales` - Create sale (Supplier/Staff)

### Inventory
- `GET /api/inventory` - Get inventory status
- `GET /api/inventory/alerts` - Get low stock alerts
- `PUT /api/inventory/:id/stock` - Update stock (Admin)

### Reports
- `GET /api/reports/sales` - Sales report (Admin)
- `GET /api/reports/inventory` - Inventory report (Admin)
- `GET /api/reports/top-products` - Top products (Admin)
- `GET /api/reports/revenue-trends` - Revenue trends (Admin)

### Health Check
- `GET /api/health` - API health check endpoint (optimized for Render keep-alive)
- `GET /api/health/detailed` - Detailed health check with database status

## Security Features

- JWT-based authentication with HTTP-only cookies
- Password hashing with bcryptjs
- Account locking after failed login attempts (30-minute lock)
- Role-based access control (Admin, Staff, Supplier)
- Input validation and sanitization with express-validator
- Rate limiting on API endpoints
- CORS configuration with credentials support
- Cookie-based session management

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart on file changes
```

The backend server will:
- Connect to MongoDB with optimized connection pooling
- Handle connection retries automatically
- Run on `http://localhost:5000`
- Support ES Modules (import/export syntax)

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with hot module replacement (HMR)
```

The frontend will:
- Run on `http://localhost:3000`
- Proxy `/api` requests to `http://localhost:5000`
- Support lazy loading and code splitting
- Enable hot module replacement for instant updates

### Building for Production

Backend:
```bash
cd backend
npm start  # Production mode (no auto-restart)
```

Frontend:
```bash
cd frontend
npm run build  # Creates optimized production build in dist/
npm run preview  # Preview production build locally
```

**Production Build Features:**
- Code splitting with manual chunks (react-vendor, ui-vendor, chart-vendor, pdf-vendor, utils-vendor)
- Terser minification with console.log removal
- Optimized asset caching
- Source maps disabled for smaller bundle size

## Deployment

### Frontend (Vercel)
The frontend is configured for deployment on Vercel:
- `vercel.json` handles SPA routing (all routes → `/index.html`)
- Set `VITE_API_URL` environment variable in Vercel dashboard
- Root directory should be set to `frontend/` in Vercel project settings

### Backend (Render)
The backend is optimized for deployment on Render:
- Health check endpoint at `/api/health` for keep-alive
- Optimized MongoDB connection pooling for serverless environments
- Trust proxy enabled for correct IP detection behind reverse proxy
- Extended timeout support (90s) for cold starts

See `VERCEL_FRONTEND_SETUP.md` for detailed deployment instructions and troubleshooting.

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string (default: mongodb://localhost:27017/blcm)
- `JWT_SECRET` - Secret key for JWT tokens (required, change in production)
- `JWT_EXPIRE` - JWT expiration time (default: 7d)
- `NODE_ENV` - Environment mode: `development` or `production`
- `FRONTEND_URL` - Frontend URL for CORS configuration (default: http://localhost:3000)
  - For production: Set to your Vercel frontend URL (e.g., `https://your-app.vercel.app`)

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
  - **Local development**: Optional (Vite proxy handles `/api` requests)
  - **Production (Vercel)**: Required - Set to your Render backend URL (e.g., `https://your-backend.onrender.com/api`)
  - The URL is automatically normalized to end with `/api` if not provided

**Note:** 
- All environment variables in the frontend must be prefixed with `VITE_` to be accessible in the application.
- For Vercel deployments, set `VITE_API_URL` in the Vercel dashboard under Settings → Environment Variables.
- See `VERCEL_FRONTEND_SETUP.md` for detailed deployment instructions.

## License

ISC


