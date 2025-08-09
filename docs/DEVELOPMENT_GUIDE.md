# 👨‍💻 DeedPro Development Guide

## ⚠️ CRITICAL: Monorepo Development

**This guide covers developing in a MONOREPO with frontend and backend in the same repository.**

- **Frontend Development**: Work in `/frontend` directory
- **Backend Development**: Work in `/backend` directory  
- **Shared Resources**: Templates, scripts, documentation

---

## 🏗️ **Development Environment Setup**

### ⚠️ **PRODUCTION-ONLY TESTING POLICY**

**DeedPro uses PRODUCTION-ONLY testing and development:**
- ✅ All testing is performed directly on production environment (Render)
- ❌ No local development environment is maintained
- ✅ All database operations, API testing, and feature development happens on production
- ✅ Backend API: `https://deedpro-main-api.onrender.com`
- ✅ Frontend: Deployed on Vercel

### **Production Development Workflow**

```bash
# Clone monorepo for code changes only
git clone https://github.com/easydeed/new-front
cd new-front

# All testing uses production endpoints
curl https://deedpro-main-api.onrender.com/health

# Test user credentials for production testing
Email: test@deedpro-check.com
Password: TestPassword123!
```

### **Production Environment Access**
- **Backend**: Render.com deployment
- **Database**: Render PostgreSQL instance  
- **Frontend**: Vercel deployment
- **All Testing**: Direct on production systems

### **Directory Structure for Development**
```
new-front/                          # Monorepo root
├── 🌐 frontend/                    # Frontend development
│   ├── src/app/                   # Next.js pages
│   ├── src/components/            # React components
│   ├── package.json               # Frontend deps
│   └── .env.local                 # Frontend env vars
├── ⚙️ backend/                     # Backend development
│   ├── main.py                    # FastAPI app
│   ├── auth.py, database.py       # Backend modules
│   ├── requirements.txt           # Backend deps
│   └── .env                       # Backend env vars
├── 📄 templates/                   # Shared templates
├── 📜 scripts/                     # Database scripts
└── 📚 Documentation/               # Project docs
```

---

## 🌐 **Frontend Development**

### **Development Workflow**
```bash
# Navigate to frontend
cd frontend

# Start development server
npm run dev

# Available scripts:
npm run dev        # Development server (http://localhost:3000)
npm run build      # Production build
npm run start      # Start production build
npm run lint       # ESLint checking
npm run type-check # TypeScript checking
```

### **Frontend Architecture**
```
frontend/src/
├── app/                           # Next.js 13+ App Router
│   ├── page.tsx                  # Homepage
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── login/page.tsx            # Authentication
│   ├── register/page.tsx         # User registration
│   ├── dashboard/page.tsx        # User dashboard
│   ├── create-deed/page.tsx      # Deed creation wizard
│   ├── account-settings/page.tsx # User settings
│   ├── admin/page.tsx            # Admin dashboard
│   └── [other pages]/
└── components/
    ├── Navbar.tsx                # Navigation
    ├── Sidebar.tsx               # Dashboard sidebar
    ├── Hero.tsx                  # Landing page hero
    ├── Features.tsx              # Feature showcase
    └── [other components]/
```

### **Frontend Development Rules**
- ✅ **Work only in `/frontend` directory**
- ✅ **Use TypeScript for all new code**
- ✅ **Follow Next.js 13+ App Router patterns**
- ✅ **Use Tailwind CSS for styling**
- ✅ **API calls via `NEXT_PUBLIC_API_URL`**
- ❌ **Never import from `/backend`**
- ❌ **Never hardcode API URLs**

### **Adding New Pages**
```bash
# Create new page
mkdir frontend/src/app/new-page
touch frontend/src/app/new-page/page.tsx

# Example page.tsx:
export default function NewPage() {
  return (
    <div className="min-h-screen bg-white">
      <h1 className="text-3xl font-bold">New Page</h1>
    </div>
  );
}
```

### **Adding New Components**
```bash
# Create component
touch frontend/src/components/NewComponent.tsx

# Example component:
interface NewComponentProps {
  title: string;
}

export default function NewComponent({ title }: NewComponentProps) {
  return <div className="p-4">{title}</div>;
}
```

### **Environment Variables (Frontend)**
```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_WIDGET_ADDON_ENABLED=true
```

---

## ⚙️ **Backend Development**

### **Development Workflow**
```bash
# Navigate to backend
cd backend

# Activate virtual environment (recommended)
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start development server
python main.py

# Available operations:
python main.py              # Start FastAPI server
pytest tests/               # Run tests
python -m uvicorn main:app --reload  # Auto-reload server
```

### **Backend Architecture**
```
backend/
├── main.py                       # FastAPI application (1400+ lines)
├── auth.py                       # JWT authentication
├── database.py                   # PostgreSQL operations
├── ai_assist.py                  # AI assistance features
├── requirements.txt              # Dependencies
├── .env                          # Environment variables
└── scripts/                      # Database utilities
    ├── setup_database.py         # Initial DB setup
    ├── add_addon.py              # Widget addon setup
    └── fix_database.py           # Database repairs
```

### **Backend Development Rules**
- ✅ **Work only in `/backend` directory**
- ✅ **Use FastAPI for all new endpoints**
- ✅ **Follow async/await patterns**
- ✅ **Use PostgreSQL for data storage**
- ✅ **Templates via `../templates` relative path**
- ❌ **Never import from `/frontend`**
- ❌ **Never hardcode frontend URLs in code**

### **Adding New API Endpoints**
```python
# In backend/main.py
@app.get("/api/new-endpoint")
async def new_endpoint(user_id: str = Depends(get_current_user_id)):
    """
    New API endpoint description
    """
    try:
        # Your logic here
        return {"status": "success", "data": "result"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### **Database Operations**
```python
# Example database function
async def create_new_record(data: dict):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO table_name (column1, column2) VALUES (%s, %s)",
            (data['value1'], data['value2'])
        )
        conn.commit()
    return {"status": "created"}
```

### **Environment Variables (Backend)**
```env
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/deedpro
JWT_SECRET_KEY=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_your_key
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 📄 **Template Development**

### **Template Location**
```bash
# Templates shared between frontend and backend
ls templates/
# grant_deed.html
# quitclaim_deed.html
```

### **Template Development Workflow**
```bash
# Edit template
cd templates
# Edit .html files with Jinja2 syntax

# Test template rendering
cd ../backend
python -c "
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('../templates'))
template = env.get_template('grant_deed.html')
html = template.render({'grantor': 'Test', 'grantee': 'Test'})
print('Template renders successfully!')
"
```

### **Template Development Rules**
- ✅ **Use Jinja2 syntax for variables**
- ✅ **Follow legal document formatting**
- ✅ **Test with sample data**
- ✅ **Maintain consistent styling**
- ❌ **Never hardcode values**
- ❌ **Never break legal formatting**

---

## 🗄️ **Database Development**

### **Database Scripts Location**
```bash
# Database maintenance scripts
ls scripts/
# add_addon.py
# setup_database.py
```

### **Running Database Scripts**
```bash
# From project root or scripts directory
cd scripts
python setup_database.py      # Initial setup
python add_addon.py           # Widget licensing
python new_migration.py       # Custom migrations
```

### **Database Development Rules**
- ✅ **Create migration scripts for schema changes**
- ✅ **Test migrations on local database first**
- ✅ **Use parameterized queries (prevent SQL injection)**
- ✅ **Include rollback procedures**
- ❌ **Never run untested scripts on production**
- ❌ **Never commit database credentials**

---

## 💰 **Pricing Management Development**

### **Pricing System Architecture**
```
Frontend Admin UI (/admin/page.tsx)
        ↓ API calls
Backend Endpoints (/backend/main.py)
        ↓ Database + Stripe API
PostgreSQL (pricing table) + Stripe (products/prices)
```

### **Key Components**
- **Frontend UI**: `/frontend/src/app/admin/page.tsx` (pricing tab)
- **Backend API**: `/backend/main.py` (pricing endpoints)
- **Database Table**: `pricing` (plan data and Stripe IDs)
- **Database Script**: `/scripts/add_pricing.py` (table creation)

### **Development Workflow**

**1. Create New Plan:**
```bash
# In admin UI: /admin → Pricing Management
# Fill form: plan_name="test", price=19.99, features="Feature 1, Feature 2"
# Click "Create Plan"
# Result: Creates Stripe product + price, saves to database
```

**2. Sync from Stripe:**
```bash
# In admin UI: Click "Sync from Stripe"
# Result: Pulls all active Stripe prices, updates database
```

**3. Update Plan:**
```bash
# In admin UI: Edit price/features in plan card, click "Update Plan"
# Result: Creates new Stripe price (old one deactivated), updates database
```

### **Testing Pricing System**

**Local Testing:**
```bash
# 1. Start backend
cd backend && python main.py

# 2. Create test plan via API
curl -X POST http://localhost:8000/admin/create-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "plan_name": "test_plan",
    "price": 10.00,
    "features": ["Test feature 1", "Test feature 2"]
  }'

# 3. Verify in database
psql $DATABASE_URL -c "SELECT * FROM pricing WHERE plan_name='test_plan';"

# 4. Check landing page
curl http://localhost:3000/api/pricing
```

**Production Testing:**
```bash
# 1. Test create plan in admin UI
# 2. Verify in Stripe Dashboard → Products
# 3. Check landing page reflects changes
# 4. Test sync functionality
```

### **Pricing API Endpoints**

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/pricing` | GET | Get all active plans for landing page | No |
| `/admin/create-plan` | POST | Create new Stripe product/price | Admin |
| `/admin/sync-pricing` | POST | Sync prices from Stripe to database | Admin |
| `/admin/update-price` | POST | Update existing plan price/features | Admin |

### **Pricing Development Rules**
- ✅ **Test plan creation in both local and Stripe test mode**
- ✅ **Verify database updates after Stripe operations**
- ✅ **Check landing page displays updated pricing**
- ✅ **Use admin authentication for pricing endpoints**
- ✅ **Handle Stripe API errors gracefully**
- ❌ **Never create plans without proper admin authentication**
- ❌ **Never use Stripe live keys in development**
- ❌ **Never hard-code pricing in frontend (always fetch from API)**

### **Common Pricing Issues & Solutions**

**Issue**: Template not found for pricing creation
```bash
# Solution: Ensure admin user has role='admin' in database
UPDATE users SET role='admin' WHERE email='your_admin@example.com';
```

**Issue**: Stripe API errors in development
```bash
# Solution: Check environment variables
echo $STRIPE_SECRET_KEY  # Should start with sk_test_
echo $STRIPE_PUBLISHABLE_KEY  # Should start with pk_test_
```

**Issue**: Landing page not showing new pricing
```bash
# Solution: Check API response
curl http://localhost:3000/api/pricing
# Should return array of plans with updated data
```

---

## 🔧 **Development Tools & Workflow**

### **Recommended Development Setup**

**Terminal Setup:**
```bash
# Terminal 1: Backend
cd backend && python main.py

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: General commands
# Available for git, database scripts, etc.
```

**VS Code Extensions:**
- **Python**: ms-python.python
- **TypeScript**: ms-vscode.vscode-typescript-next
- **Tailwind CSS**: bradlc.vscode-tailwindcss
- **Prettier**: esbenp.prettier-vscode
- **ESLint**: dbaeumer.vscode-eslint

### **Git Workflow**
```bash
# Feature development workflow
git checkout -b feature/new-feature

# Make changes in appropriate directory
cd frontend/src/app/  # or backend/
# Edit files...

# Test changes
cd ../../ && npm run dev  # Test frontend
cd ../backend && python main.py  # Test backend

# Commit changes
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create pull request
```

### **Code Quality Tools**

**Frontend (package.json scripts):**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build", 
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write ."
  }
}
```

**Backend (development tools):**
```bash
# Code formatting
pip install black isort
black backend/
isort backend/

# Type checking
pip install mypy
mypy backend/

# Testing
pip install pytest
pytest backend/tests/
```

---

## 🧪 **Testing Strategy**

### **Frontend Testing**
```bash
cd frontend

# Unit tests (if implemented)
npm run test

# Type checking
npm run type-check

# Build testing
npm run build

# Visual testing
npm run dev
# Manual testing in browser
```

### **Backend Testing**
```bash
cd backend

# API testing
pytest tests/

# Manual endpoint testing
curl http://localhost:8000/health
curl http://localhost:8000/docs

# Database testing
python -c "
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
print('DB connection OK')
"
```

### **Integration Testing**
```bash
# Full stack testing
# 1. Start both frontend and backend
# 2. Test user flows:
#    - Registration/Login
#    - Deed creation
#    - Widget access
#    - Admin functions

# API integration testing
curl -X POST http://localhost:3000/api/test
# Should proxy to backend or make direct API calls
```

### **CI/CD for Tests**

Add `.github/workflows/test.yml`:
```yaml
name: Run Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with: 
        python-version: '3.8'
    - run: pip install -r backend/requirements.txt
    - run: pytest backend/tests/
```

Run on push to catch issues early.

---

## 🚀 **Deployment Workflow**

### **Development → Staging → Production**

**Frontend Deployment:**
```bash
# Test build locally
cd frontend && npm run build

# Deploy to Vercel
cd .. && vercel --prod

# Result: https://deedpro-frontend-new.vercel.app
```

**Backend Deployment:**
```bash
# Commit backend changes
git add backend/ templates/ scripts/
git commit -m "backend: update API"
git push origin main

# Auto-deploys to Render
# Result: https://deedpro-main-api.onrender.com
```

### **Environment Promotion**
- **Development**: Local environment (localhost)
- **Staging**: Branch deployments (feature branches)
- **Production**: Main branch auto-deployment

---

## 🚨 **Development Best Practices**

### **Code Organization**
- ✅ **Keep frontend and backend code separate**
- ✅ **Use TypeScript interfaces for API contracts**
- ✅ **Implement proper error handling**
- ✅ **Follow consistent naming conventions**
- ✅ **Write self-documenting code**

### **API Development**
- ✅ **Use FastAPI automatic documentation**
- ✅ **Implement proper status codes**
- ✅ **Validate all inputs**
- ✅ **Handle errors gracefully**
- ✅ **Use async/await for database operations**

### **Security Practices**
- ✅ **Never commit secrets to git**
- ✅ **Use environment variables for config**
- ✅ **Validate and sanitize all inputs**
- ✅ **Implement proper authentication**
- ✅ **Use HTTPS in production**

### **Performance Optimization**
- ✅ **Optimize database queries**
- ✅ **Use Next.js image optimization**
- ✅ **Implement proper caching**
- ✅ **Minimize bundle sizes**
- ✅ **Use connection pooling**

---

## 🐛 **Debugging Guide**

### **Frontend Debugging**
```bash
# Check console errors
# Browser → F12 → Console

# Network debugging
# Browser → F12 → Network → Check API calls

# React DevTools
# Install React DevTools browser extension

# Next.js debugging
npm run dev
# Check terminal output for errors
```

### **Backend Debugging**
```bash
# FastAPI automatic docs
# http://localhost:8000/docs

# Server logs
python main.py
# Check terminal output

# Database debugging
psql $DATABASE_URL
# \dt (show tables)
# \d table_name (describe table)

# Python debugging
import pdb; pdb.set_trace()  # Add breakpoint
```

### **Integration Debugging**
```bash
# CORS issues
# Check ALLOWED_ORIGINS in backend/.env
# Verify API calls in browser network tab

# Environment variable issues
# Check .env files exist and have correct values
# Verify environment variable names (NEXT_PUBLIC_* for frontend)

# Template path issues
# Verify templates/ directory exists
# Check relative path from backend: ../templates/
```

---

## 📚 **Development Resources**

### **Documentation**
- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev/
- **FastAPI**: https://fastapi.tiangolo.com/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs

### **Development Tools**
- **Vercel CLI**: https://vercel.com/docs/cli
- **Postman**: For API testing
- **pgAdmin**: PostgreSQL administration
- **VS Code**: Code editor with extensions

---

## 🎯 **Development Checklist**

### **Before Starting Development**
- [ ] Repository cloned and setup complete
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Database connection working
- [ ] Environment variables configured
- [ ] Both frontend and backend servers running

### **Before Committing Code**
- [ ] Code tested locally
- [ ] No console errors or warnings
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Backend tests pass (`pytest`)

### **Before Deployment**
- [ ] All tests passing
- [ ] Environment variables updated for production
- [ ] Database migrations applied
- [ ] Performance tested
- [ ] Security checks completed

---

**🚨 Remember**: This is MONOREPO development. Keep frontend and backend concerns separate while working in the same repository! 🎯 