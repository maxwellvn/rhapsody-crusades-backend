# PHP to Next.js Backend Migration Checklist

## Project Setup
- [x] Initialize Next.js project with TypeScript
- [x] Install dependencies (mongoose, bcryptjs, jsonwebtoken, stripe)
- [x] Configure TypeScript (tsconfig.json)
- [x] Configure Next.js (next.config.js)
- [x] Set up environment variables (.env.local, .env.example)
- [x] Configure Tailwind CSS for admin panel

## Core Infrastructure
- [x] MongoDB connection (src/lib/db.ts)
- [x] JWT utilities (src/lib/jwt.ts)
- [x] Authentication middleware (src/lib/auth.ts)
- [x] Standardized API responses (src/lib/response.ts)
- [x] Input validation (src/lib/validator.ts)
- [x] Stripe integration (src/lib/stripe.ts)
- [x] CORS middleware (src/middleware.ts)

## Database Models
- [x] User model
- [x] Event model
- [x] Ticket model
- [x] Testimony model
- [x] TestimonyCategory model
- [x] Notification model
- [x] EventStaff model
- [x] PasswordReset model
- [x] Admin model

## Authentication Endpoints (/api/v1/auth/*)
- [x] POST /register - User registration
- [x] POST /login - User login
- [x] POST /kingschat - KingsChat OAuth authentication
- [x] GET /kingschat-callback - OAuth callback for mobile deep linking
- [x] POST /forgot-password - Request password reset
- [x] POST /reset-password - Reset password with token

## User Endpoints (/api/v1/user/*)
- [x] GET /profile - Get current user profile
- [x] PUT /profile - Update user profile
- [x] GET /tickets - Get user's tickets
- [x] GET /tickets/[id] - Get single ticket
- [x] POST /tickets/[id]/checkin - Check in ticket
- [x] GET /stats - Get user statistics
- [x] GET /lookup - Lookup user by QR code
- [x] GET /staff-events - Get events where user is staff

## Events Endpoints (/api/v1/events/*)
- [x] GET / - List events with filters
- [x] POST / - Create new event
- [x] GET /[id] - Get single event
- [x] DELETE /[id] - Delete event
- [x] POST /[id]/register - Register for event
- [x] GET /my-crusades - Get user's created events
- [x] GET /[id]/staff - Get event staff
- [x] POST /[id]/staff - Add staff member
- [x] DELETE /[id]/staff/[staffId] - Remove staff member
- [x] GET /[id]/attendees - Get event attendees

## Testimonies Endpoints (/api/v1/testimonies/*)
- [x] GET / - List testimonies
- [x] POST / - Create testimony
- [x] GET /[id] - Get single testimony
- [x] PUT /[id] - Update testimony
- [x] DELETE /[id] - Delete testimony
- [x] POST /[id]/like - Toggle like

## Testimony Categories (/api/v1/testimony-categories/*)
- [x] GET / - List categories
- [x] GET /[id] - Get category (by id or slug)

## Notifications Endpoints (/api/v1/notifications/*)
- [x] GET / - Get notifications with pagination
- [x] PUT /read - Mark notification as read
- [x] PUT /read-all - Mark all as read

## Donations Endpoints (/api/v1/donations/*)
- [x] POST /create-payment-intent - Create Stripe payment intent

## Admin Panel
- [x] Admin authentication (session-based)
- [x] Login page
- [x] Dashboard with statistics
- [x] Users management page
- [x] Events management page
- [x] Tickets management page
- [x] Testimonies moderation page
- [x] Testimony categories CRUD page
- [x] Navigation component
- [x] Logout functionality

## Deployment
- [x] Dockerfile for Coolify
- [x] .dockerignore
- [x] Data migration script (scripts/migrate-data.ts)

---

## Post-Migration Steps

### 1. Start MongoDB
```bash
# Make sure MongoDB is running locally or use a cloud instance
mongod
```

### 2. Install Dependencies
```bash
cd backend-next
npm install
```

### 3. Set Environment Variables
```bash
# Copy .env.example to .env.local and update values
cp .env.example .env.local
# Edit MONGODB_URI, STRIPE_SECRET_KEY, etc.
```

### 4. Run Data Migration (Optional)
```bash
# Make sure PHP backend data folder exists at ../backend/data
npm run migrate
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Test Endpoints
- Test with existing mobile app by updating API base URL
- Verify all endpoints return expected responses
- Check admin panel at /admin

### 7. Deploy to Coolify
```bash
# Build Docker image
docker build -t rhapsody-backend .

# Or push to Coolify and let it build from Dockerfile
```

---

## API Compatibility Notes

1. **Response Format**: All endpoints return `{ success: boolean, message: string, data: T }`
2. **JWT Tokens**: Compatible with existing mobile app (30-day expiry)
3. **Token Refresh**: Automatic refresh via `x-new-token` header
4. **CORS**: Configured for all origins (*)
5. **Pagination**: Uses `{ pagination: { total, page, per_page, total_pages } }`

## Default Admin Credentials
- Username: `admin`
- Password: `admin123`

**Important**: Change these credentials in production!
