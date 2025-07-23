# DeedPro Registration & Stripe Integration Setup Guide

This guide walks you through setting up the complete registration, free trial, and Stripe payment system for DeedPro.

## 🚀 Quick Start

### 1. Database Setup

First, initialize the database with the new schema:

```bash
cd backend
python scripts/init_db.py
```

This will create:
- ✅ Enhanced users table with plan management
- ✅ Deeds table with user relationships  
- ✅ Subscriptions table for Stripe integration
- ✅ API usage tracking
- ✅ Plan limits configuration
- ✅ Test user accounts for development

### 2. Backend Environment Variables

Create `backend/.env` with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/deedpro

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here

# Stripe Price IDs (create these in your Stripe dashboard)
STRIPE_PROFESSIONAL_PRICE_ID=your_professional_price_id
STRIPE_ENTERPRISE_PRICE_ID=your_enterprise_price_id

# Frontend URL (for Stripe redirects)
FRONTEND_URL=http://localhost:3000

# OpenAI Integration (Optional)
OPENAI_API_KEY=your_openai_key_here

# CORS Configuration
ALLOWED_ORIGINS=*
```

### 3. Frontend Environment Variables

Create `frontend/.env.local`:

```env
# Backend API URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_EXTERNAL_API_URL=http://localhost:8001

# Stripe (for frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 4. Install Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend  
cd ../frontend
npm install
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

## 🎯 Features Implemented

### ✅ User Registration System
- **Location**: `/register` page
- **Features**:
  - Comprehensive form validation
  - Password strength requirements
  - Email format validation
  - State code validation
  - Terms agreement requirement
  - Bubbly, iPhone-inspired design

### ✅ Authentication System
- **JWT-based authentication**
- **Password hashing with bcrypt**
- **Secure login/logout flow**
- **Token-based API access**

### ✅ Plan Management
- **Three tiers**: Free, Professional, Enterprise
- **Free plan**: 5 deeds/month, basic AI assistance
- **Professional plan**: Unlimited deeds, SoftPro integration, priority support
- **Enterprise plan**: Everything + Qualia, API access, 24/7 support

### ✅ Stripe Integration
- **Checkout Sessions** for plan upgrades
- **Customer Portal** for subscription management
- **Webhook handling** for payment events
- **Plan enforcement** based on subscription status

### ✅ Plan Limits Enforcement
- **Real-time checking** in deed creation workflow
- **Usage counters** for free tier users  
- **Upgrade prompts** when limits reached
- **Visual indicators** of usage status

## 🔧 Stripe Setup Instructions

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Navigate to the dashboard
3. Switch to "Test mode" for development

### 2. Get API Keys
1. Go to Developers > API keys
2. Copy your **Publishable key** and **Secret key**
3. Add them to your environment files

### 3. Create Products & Prices
1. Go to Products > Add product
2. Create two products:
   - **Professional Plan** ($29/month)
   - **Enterprise Plan** ($99/month)
3. Copy the Price IDs and add to `backend/.env`

### 4. Set Up Webhooks
1. Go to Developers > Webhooks
2. Add endpoint: `http://localhost:8000/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. Copy the webhook secret to `backend/.env`

### 5. Test with Stripe CLI (Optional)
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:8000/payments/webhook

# Test payments with test cards
# 4242 4242 4242 4242 (Success)
# 4000 0000 0000 0002 (Decline)
```

## 📊 Database Schema

### Enhanced Users Table
```sql
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  company_name VARCHAR(255),
  company_type VARCHAR(50),
  phone VARCHAR(20),
  state CHAR(2) NOT NULL,
  subscribe BOOLEAN DEFAULT FALSE,
  plan VARCHAR(50) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
)
```

### Plan Limits Configuration
```sql
plan_limits (
  plan_name VARCHAR(50) UNIQUE NOT NULL,
  max_deeds_per_month INTEGER,
  api_calls_per_month INTEGER,
  ai_assistance BOOLEAN DEFAULT TRUE,
  integrations_enabled BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE
)
```

## 🧪 Testing

### Test Accounts Created
The database initialization script creates these test accounts:

1. **Free Plan User**
   - Email: `test@escrow.com`
   - Password: `testpass123`
   - Plan: Free (5 deeds/month limit)

2. **Professional Plan User**
   - Email: `pro@title.com`
   - Password: `propass123`
   - Plan: Professional (unlimited deeds)

3. **Enterprise Admin User**
   - Email: `admin@deedpro.com`
   - Password: `adminpass123`
   - Plan: Enterprise (all features)

### Testing Workflow
1. **Registration**: Visit `/register` and create a new account
2. **Login**: Visit `/login` and sign in with test credentials
3. **Plan Limits**: Try creating deeds with free account to test limits
4. **Upgrade**: Test the upgrade flow with Stripe test cards
5. **Subscription Management**: Test the billing portal integration

## 🚀 Deployment

### Backend Deployment (Render)
1. **Database**: Create PostgreSQL instance on Render
2. **Web Service**: Deploy backend with environment variables
3. **Environment Variables**: Add all production values
4. **Database Migration**: Run `python scripts/init_db.py` on production

### Frontend Deployment (Vercel)
1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Environment Variables**: Add production API URLs and Stripe keys
3. **Build Settings**: 
   - Framework: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`

## 📞 API Endpoints Added

### Authentication
- `POST /users/register` - User registration
- `POST /users/login` - User authentication
- `GET /users/profile` - Get user profile with plan info

### Plan Management
- `POST /users/upgrade` - Initiate plan upgrade via Stripe
- `POST /payments/create-portal-session` - Open Stripe billing portal

### Stripe Webhooks
- `POST /payments/webhook` - Handle Stripe events

### Plan Limits
- Internal function: `check_plan_limits()` - Validate user limits

## 🎉 Success Metrics

When everything is working correctly, you should see:

### Registration Flow ✅
- New users can register successfully
- Email validation works
- Password requirements enforced
- Users redirected to login page

### Authentication Flow ✅
- Users can log in with credentials
- JWT tokens generated and stored
- Protected routes require authentication
- User profile loads correctly

### Plan Management ✅
- Plan information displays correctly
- Upgrade buttons work and redirect to Stripe
- Billing portal opens for subscription management
- Plan changes reflect immediately

### Deed Creation ✅
- Free users see usage counter (X/5 deeds)
- Free users blocked after 5 deeds
- Upgrade prompts appear when limits reached
- Professional/Enterprise users have unlimited access

### Stripe Integration ✅
- Checkout sessions create successfully
- Webhooks update user plans automatically
- Subscription management works via billing portal
- Test payments process correctly

---

🎯 **Ready to test your complete registration and Stripe integration system!** 