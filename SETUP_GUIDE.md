# 🛠️ DeedPro Complete Setup Guide

## ⚠️ CRITICAL: Monorepo Setup

**This guide covers setting up the COMPLETE DeedPro platform from a single monorepo.**

The monorepo contains both frontend and backend with shared resources.

---

## 📋 **Prerequisites**

### **System Requirements**
- **Node.js**: 18+ (for frontend)
- **Python**: 3.8+ (for backend)  
- **PostgreSQL**: 12+ (database)
- **Git**: Latest version
- **Code Editor**: VS Code recommended

### **Account Requirements**
- **GitHub Account**: For repository access
- **Vercel Account**: For frontend hosting
- **Render Account**: For backend hosting
- **Stripe Account**: For payment processing
- **PostgreSQL Database**: (Render PostgreSQL or external)

---

## 🏗️ **Repository Setup**

### **Step 1: Clone Monorepo**
```bash
# Clone the complete monorepo
git clone https://github.com/easydeed/new-front
cd new-front

# Verify monorepo structure
ls -la
# Expected: frontend/, backend/, templates/, scripts/, docs...
```

### **Step 2: Verify Directory Structure**
```
new-front/                          # MONOREPO ROOT
├── frontend/                       # Next.js frontend
│   ├── src/app/                   # Pages and components
│   ├── package.json               # Frontend dependencies
│   └── next.config.js             # Next.js configuration
├── backend/                        # FastAPI backend
│   ├── main.py                    # FastAPI application
│   ├── requirements.txt           # Backend dependencies
│   ├── auth.py                    # Authentication
│   └── database.py                # Database operations
├── templates/                      # Deed templates
│   ├── grant_deed.html            # Grant deed template
│   └── quitclaim_deed.html        # Quitclaim deed template
├── scripts/                        # Database scripts
└── [Documentation files]
```

---

## 🌐 **Frontend Setup**

### **Step 1: Install Dependencies**
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### **Step 2: Environment Configuration**
Create `frontend/.env.local`:
```env
# Local Development
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key

# Optional Development Settings
NEXT_PUBLIC_ANALYTICS_ID=
NEXT_PUBLIC_WIDGET_ADDON_ENABLED=true
```

### **Step 3: Test Frontend**
```bash
# Start development server
npm run dev

# Expected output:
# ▲ Next.js 13.x.x
# - Local:        http://localhost:3000
# - Network:      http://192.168.x.x:3000

# Test in browser: http://localhost:3000
```

### **Step 4: Build Test**
```bash
# Test production build
npm run build

# Expected: Successful build without errors
# Expected: Pages compile successfully
```

---

## ⚙️ **Backend Setup**

### **Step 1: Python Environment**
```bash
# Navigate to backend directory
cd ../backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Verify Python version
python --version
# Expected: Python 3.8+
```

### **Step 2: Install Dependencies**
```bash
# Install backend dependencies
pip install -r requirements.txt

# Verify key packages installed
pip list | grep -E "(fastapi|uvicorn|psycopg2|stripe)"
```

### **Step 3: Environment Configuration**
Create `backend/.env`:
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/deedpro

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application Settings
ALLOWED_ORIGINS=http://localhost:3000
API_RATE_LIMIT=100
LOG_LEVEL=DEBUG
```

### **Step 4: Test Backend**
```bash
# Start FastAPI server
python main.py

# Expected output:
# INFO:     Uvicorn running on http://localhost:8000
# INFO:     Application startup complete

# Test in browser:
# - http://localhost:8000 (health check)
# - http://localhost:8000/docs (API documentation)
```

---

## 🗄️ **Database Setup**

### **Step 1: PostgreSQL Installation**

**Option A: Local PostgreSQL**
```bash
# Windows (using Chocolatey)
choco install postgresql

# macOS (using Homebrew)
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
```

**Option B: Docker PostgreSQL**
```bash
# Run PostgreSQL in Docker
docker run --name deedpro-db \
  -e POSTGRES_DB=deedpro \
  -e POSTGRES_USER=deedpro_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:12
```

**Option C: Cloud Database (Render/Supabase)**
- Use Render PostgreSQL addon
- Or external PostgreSQL service

### **Step 2: Database Initialization**
```bash
# Navigate to scripts directory
cd ../scripts

# Run database setup
python setup_database.py

# Run widget addon setup
python add_addon.py

# Expected: Tables created successfully
```

### **Step 3: Verify Database**
```bash
# Test database connection from backend
cd ../backend
python -c "
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
print('Database connection successful!')
conn.close()
"
```

---

## 🔗 **Integration Testing**

### **Step 1: Full Stack Test**
```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Start frontend (new terminal)
cd frontend  
npm run dev

# Terminal 3: Test integration
curl http://localhost:3000
curl http://localhost:8000/health
```

### **Step 2: API Connectivity Test**
```bash
# Test frontend → backend communication
# Open browser: http://localhost:3000
# Open Developer Console (F12)
# Check Network tab for API calls to localhost:8000
```

### **Step 3: Template Testing**
```bash
# Test deed generation
curl -X POST http://localhost:8000/generate-deed-preview \
  -H "Content-Type: application/json" \
  -d '{
    "deed_type": "grant_deed",
    "data": {
      "grantor": "Test Grantor",
      "grantee": "Test Grantee",
      "property_description": "Test Property"
    }
  }'
```

---

## 🔧 **Development Tools Setup**

### **Code Editor Configuration (VS Code)**

**Recommended Extensions:**
```json
{
  "recommendations": [
    "ms-python.python",
    "bradlc.vscode-tailwindcss", 
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-python.flake8",
    "ms-python.black-formatter"
  ]
}
```

**Workspace Settings** (`.vscode/settings.json`):
```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "python.formatting.provider": "black",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

### **Git Hooks Setup**
```bash
# Install pre-commit hooks (optional)
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/psf/black
    rev: 22.3.0
    hooks:
      - id: black
        files: backend/.*\.py$
        
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v2.6.2
    hooks:
      - id: prettier
        files: frontend/.*\.(ts|tsx|js|jsx|json|css)$
EOF

# Install hooks
pre-commit install
```

---

## 🚀 **Production Setup**

### **Environment Variables for Production**

**Frontend (Vercel):**
```env
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

**Backend (Render):**
```env
DATABASE_URL=postgresql://prod_user:prod_pass@prod_host:5432/prod_db
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
JWT_SECRET_KEY=super_secure_production_key
ALLOWED_ORIGINS=https://deedpro-frontend-new.vercel.app
LOG_LEVEL=INFO
```

### **Stripe Webhook Configuration**

**5. Configure Stripe Webhook in Render**
- In Render Dashboard > deedpro-main-api > Environment: Add `STRIPE_WEBHOOK_SECRET=whsec_your_secret`
- In Stripe Dashboard > Webhooks > Add Endpoint: URL = `https://deedpro-main-api.onrender.com/payments/webhook`, Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- Test: `stripe trigger checkout.session.completed`

### **Configuration Files**

**Create `.vercelignore`:**
```gitignore
backend/
templates/
scripts/
*.pyc
__pycache__/
.env
venv/
```

**Create `render.yaml`:**
```yaml
services:
- type: web
  name: deedpro-main-api
  env: python
  plan: free
  rootDir: backend
  buildCommand: pip install -r requirements.txt
  startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## ✅ **Verification Checklist**

### **Frontend Verification**
- [ ] `npm run dev` starts without errors
- [ ] Homepage loads at http://localhost:3000
- [ ] All pages accessible (/login, /dashboard, etc.)
- [ ] No console errors in browser
- [ ] API calls to backend working

### **Backend Verification**  
- [ ] `python main.py` starts without errors
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Health endpoint returns 200: http://localhost:8000/health
- [ ] Database connection working
- [ ] All endpoints responding

### **Integration Verification**
- [ ] Frontend can call backend APIs
- [ ] Authentication flow working
- [ ] Deed generation functional
- [ ] Widget access check working
- [ ] Templates loading correctly

### **Database Verification**
- [ ] Database connection established
- [ ] All tables created
- [ ] Widget addon column exists
- [ ] Sample data operations work

---

## 🚨 **Troubleshooting**

### **Common Frontend Issues**

**Node.js Version Mismatch:**
```bash
# Check Node.js version
node --version

# Use Node Version Manager if needed
nvm install 18
nvm use 18
```

**Dependencies Issues:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### **Common Backend Issues**

**Python Environment Issues:**
```bash
# Recreate virtual environment
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

**Database Connection Issues:**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/dbname

# Test connection manually
psql $DATABASE_URL -c "SELECT 1;"
```

### **Template Path Issues**

**Template Not Found:**
```bash
# Verify templates exist
cd templates
ls -la
# Should show: grant_deed.html, quitclaim_deed.html

# Test from backend directory
cd ../backend
python -c "
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('../templates'))
template = env.get_template('grant_deed.html')
print('Template loaded successfully!')
"
```

---

## 📚 **Next Steps**

### **After Setup Complete**
1. **Read [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - Development workflow
2. **Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Production deployment  
3. **Read [TEMPLATES_GUIDE.md](./TEMPLATES_GUIDE.md)** - Template development
4. **Test all functionality** - User registration, deed creation, etc.

### **Development Workflow**
```bash
# Daily development routine
cd new-front

# Terminal 1: Backend
cd backend && python main.py

# Terminal 2: Frontend  
cd frontend && npm run dev

# Make changes, test, commit, deploy
```

---

## 📞 **Support**

### **Setup Issues**
- Check environment variables are set correctly
- Verify all dependencies installed  
- Ensure database is running and accessible
- Check firewall/port settings

### **Documentation References**
- **Node.js**: https://nodejs.org/docs
- **Python**: https://docs.python.org/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/docs

---

**🚨 Remember**: This is a MONOREPO setup. Frontend and backend are in the same repository but run as separate services! 🎯 