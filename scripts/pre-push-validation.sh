#!/bin/bash

# 🔍 Pre-Push Validation Script
# Validates all changes before pushing to prevent deployment failures

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Running Pre-Push Validation${NC}"
echo -e "${BLUE}Timestamp: $(date)${NC}"
echo ""

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    warning "Not on main branch (currently on: $current_branch)"
    echo "Consider switching to main branch for deployment"
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    error "Uncommitted changes detected. Please commit all changes before pushing."
    echo "Uncommitted files:"
    git diff --name-only
    exit 1
fi

log "✅ Git status clean"

# Validate configuration files exist
log "🔍 Checking configuration files..."

required_files=(
    "frontend/vercel.json"
    "backend/render.yaml"
    "frontend/package.json"
    "backend/requirements.txt"
    ".github/workflows/deploy.yml"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        error "Required file missing: $file"
        exit 1
    fi
done

log "✅ All configuration files present"

# Check frontend dependencies and build
log "🔍 Validating frontend..."

cd frontend

# Check if package.json has required scripts
required_scripts=("build" "test" "lint" "type-check")
for script in "${required_scripts[@]}"; do
    if ! npm run-script --silent "$script" --dry-run > /dev/null 2>&1; then
        warning "Frontend script '$script' not found in package.json"
    fi
done

# Install dependencies
log "📦 Installing frontend dependencies..."
npm ci --silent

# Type checking
log "🔍 Running TypeScript type check..."
if command -v tsc > /dev/null; then
    npx tsc --noEmit || {
        error "TypeScript type check failed"
        exit 1
    }
else
    warning "TypeScript compiler not found, skipping type check"
fi

# Linting
log "🔍 Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    log "✅ Linting passed"
else
    warning "Linting issues detected (non-blocking)"
fi

# Build test
log "🏗️ Testing frontend build..."
npm run build || {
    error "Frontend build failed"
    exit 1
}

log "✅ Frontend validation passed"

cd ..

# Check backend dependencies and tests
log "🔍 Validating backend..."

cd backend

# Check if requirements.txt exists and install
if [ -f "requirements.txt" ]; then
    log "📦 Installing backend dependencies..."
    pip install -r requirements.txt --quiet || {
        error "Backend dependency installation failed"
        exit 1
    }
else
    error "requirements.txt not found in backend directory"
    exit 1
fi

# Check if main.py exists (FastAPI entry point)
if [ ! -f "main.py" ]; then
    error "main.py not found in backend directory"
    exit 1
fi

# Python syntax check
log "🔍 Running Python syntax check..."
python -m py_compile main.py || {
    error "Python syntax check failed for main.py"
    exit 1
}

# Check for common Python issues
log "🔍 Running Python linting..."
if command -v flake8 > /dev/null; then
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics || {
        error "Critical Python linting errors found"
        exit 1
    }
    log "✅ Python linting passed"
else
    warning "flake8 not found, skipping Python linting"
fi

# Test imports of new modules
log "🔍 Testing critical imports..."
python -c "
try:
    import main
    print('✅ Main module imports successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
    exit(1)
" || {
    error "Critical import test failed"
    exit 1
}

log "✅ Backend validation passed"

cd ..

# Check environment variable requirements
log "🔍 Checking environment variable documentation..."

env_vars_documented=(
    "OPENAI_API_KEY"
    "TITLEPOINT_API_KEY"
    "GOOGLE_PLACES_API_KEY"
    "DATABASE_URL"
)

for var in "${env_vars_documented[@]}"; do
    if ! grep -r "$var" docs/ > /dev/null 2>&1; then
        warning "Environment variable $var not documented in docs/"
    fi
done

# Check for sensitive data in code
log "🔒 Scanning for sensitive data..."

sensitive_patterns=(
    "sk-[a-zA-Z0-9]"
    "api[_-]?key.*=.*['\"][^'\"]*['\"]"
    "password.*=.*['\"][^'\"]*['\"]"
    "secret.*=.*['\"][^'\"]*['\"]"
)

for pattern in "${sensitive_patterns[@]}"; do
    if git grep -i "$pattern" -- '*.py' '*.js' '*.ts' '*.tsx' '*.json' > /dev/null 2>&1; then
        error "Potential sensitive data found matching pattern: $pattern"
        echo "Files containing sensitive data:"
        git grep -l -i "$pattern" -- '*.py' '*.js' '*.ts' '*.tsx' '*.json'
        exit 1
    fi
done

log "✅ No sensitive data detected"

# Check file sizes
log "🔍 Checking for large files..."

large_files=$(find . -type f -size +10M -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./backend/__pycache__/*")

if [ -n "$large_files" ]; then
    warning "Large files detected (>10MB):"
    echo "$large_files"
    echo "Consider adding these to .gitignore if they shouldn't be in the repository"
fi

# Validate documentation is up to date
log "🔍 Checking documentation..."

if [ ! -f "docs/IMPLEMENTATION_CHECKLIST.md" ]; then
    warning "Implementation checklist not found"
fi

if [ ! -f "docs/USER_GUIDE.md" ]; then
    warning "User guide not found"
fi

# Final summary
log "🎉 Pre-push validation completed successfully!"
echo ""
echo -e "${GREEN}✅ Ready to push to repository${NC}"
echo -e "${GREEN}✅ Auto-deployment should work correctly${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. git push origin main"
echo "2. Monitor Vercel deployment: https://vercel.com/dashboard"
echo "3. Monitor Render deployment: https://dashboard.render.com"
echo "4. Verify health checks after deployment"
echo ""
echo -e "${YELLOW}⚠️ Remember to set environment variables in:${NC}"
echo "- Vercel Dashboard → Project Settings → Environment Variables"
echo "- Render Dashboard → Service Settings → Environment Variables"

