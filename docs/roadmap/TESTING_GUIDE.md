# 🧪 Testing Guide - DeedPro Platform
**Comprehensive Testing Strategy & Procedures**

---

## 📋 **TABLE OF CONTENTS**

1. [Testing Philosophy](#testing-philosophy)
2. [Test Types & Coverage](#test-types--coverage)
3. [Running Tests](#running-tests)
4. [Cypress E2E Testing](#cypress-e2e-testing)
5. [Authentication Testing](#authentication-testing)
6. [Manual Testing](#manual-testing)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 **TESTING PHILOSOPHY**

### **Core Principles**
1. **Test the user journey** - E2E tests simulate real user behavior
2. **Test authentication** - Never bypass security for convenience
3. **Test accessibility** - Ensure compliance with WCAG standards
4. **Test performance** - Verify < 3s PDF generation, <2s API responses
5. **Test resiliency** - Verify graceful degradation when services fail

### **What We Test**
✅ **Frontend**: React components, wizard flow, user interactions  
✅ **Backend**: API endpoints, PDF generation, database operations  
✅ **Integration**: Full user journey from login to PDF download  
✅ **Accessibility**: WCAG compliance, screen reader support  
✅ **Performance**: Load times, API latency, PDF generation speed  

### **What We Don't Test**
❌ **Third-party services**: Google Places, TitlePoint (use mocks)  
❌ **Browser compatibility**: Focus on modern browsers  
❌ **Mobile-specific**: Desktop-first approach  

---

## 📊 **TEST TYPES & COVERAGE**

### **1. Frontend Unit Tests** (Jest + React Testing Library)
**Location**: `frontend/src/**/__tests__/*.test.tsx`  
**Coverage**: React components, hooks, utilities  
**Run Time**: ~5 seconds  
**Current**: 45 tests passing

**What's Tested**:
- Component rendering
- User interactions (click, type, submit)
- State management
- Error handling
- Edge cases

**Example**:
```bash
cd frontend
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

### **2. Backend Unit Tests** (Pytest)
**Location**: `backend/tests/*.py`  
**Coverage**: API endpoints, models, services  
**Run Time**: ~10 seconds  
**Current**: 28 tests passing

**What's Tested**:
- API endpoint responses
- Database operations
- PDF generation logic
- Schema validation
- Authentication & authorization

**Example**:
```bash
cd backend
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest -k "test_name"     # Run specific test
pytest --cov              # Coverage report
```

### **3. Cypress E2E Tests** (End-to-End)
**Location**: `frontend/cypress/e2e/*.cy.js`  
**Coverage**: Full user journey, integration  
**Run Time**: ~2 minutes  
**Current**: 15 tests (regression pack)

**What's Tested**:
- Login flow
- Dashboard navigation
- Document selection
- Wizard flow (all 5 steps)
- PDF generation & download
- Accessibility (axe-core)
- Error handling

**Example**:
```bash
cd frontend
npm run dev              # Terminal 1: Start dev server
npx cypress run          # Terminal 2: Run tests headless
npx cypress open         # Or: Interactive mode
```

### **4. Accessibility Tests** (axe-core + Cypress)
**Location**: Integrated with Cypress tests  
**Coverage**: WCAG 2.1 AA compliance  
**Run Time**: Included in E2E tests  

**What's Tested**:
- Color contrast
- Keyboard navigation
- Screen reader support
- Form labels
- Semantic HTML

---

## 🚀 **RUNNING TESTS**

### **Quick Start**

```bash
# Run ALL tests (complete verification)
npm run test:all          # From root (runs frontend + backend + Cypress)

# Or run individually:
cd frontend && npm run test       # Frontend only
cd backend && pytest              # Backend only
cd frontend && npx cypress run    # Cypress only
```

### **Frontend Unit Tests**

```bash
cd frontend

# Run once
npm run test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test file
npm run test -- DynamicWizard.test.tsx

# Update snapshots
npm run test -- -u
```

**Expected Output**:
```
PASS  src/app/create-deed/__tests__/dynamic-wizard.test.tsx
✓ renders document selection page (45ms)
✓ fetches document types from backend (32ms)
✓ handles API errors gracefully (18ms)
...

Test Suites: 5 passed, 5 total
Tests:       45 passed, 45 total
Time:        4.892 s
```

### **Backend Unit Tests**

```bash
cd backend

# Run all tests
pytest

# Verbose output
pytest -v

# Run specific test file
pytest tests/test_generate.py

# Run specific test
pytest tests/test_generate.py::test_grant_deed_generation

# Show print statements
pytest -s

# Stop on first failure
pytest -x

# Coverage report
pytest --cov=. --cov-report=html
```

**Expected Output**:
```
============================= test session starts ==============================
collected 28 items

tests/test_generate.py ........                                          [ 28%]
tests/test_models.py ......                                              [ 50%]
tests/test_api.py ..............                                         [100%]

============================== 28 passed in 8.45s ==============================
```

### **Cypress E2E Tests**

```bash
cd frontend

# 1. Start dev server (Terminal 1)
npm run dev
# Wait for "Ready in 1900ms"

# 2. Run Cypress (Terminal 2)
npx cypress run                          # Headless mode
npx cypress run --browser chrome         # Specific browser
npx cypress run --spec cypress/e2e/wizard-regression-pack.cy.js  # Specific test

# Interactive mode (recommended for debugging)
npx cypress open
```

**Expected Output** (Headless):
```
Running:  wizard-regression-pack.cy.js

  Wizard Regression Pack - Full E2E Suite
    Landing Page & Navigation
      ✓ should load homepage with proper accessibility (1234ms)
      ✓ should navigate to document selection (456ms)
    Document Selection
      ✓ should display available document types (789ms)
      ✓ should navigate to grant deed wizard (567ms)
    ...

  15 passing (2m 15s)
```

---

## 🔐 **CYPRESS E2E TESTING**

### **Test Structure**

```javascript
describe('Wizard Regression Pack', () => {
  // Login once before all tests
  before(() => {
    cy.session('user-session', () => {
      cy.login('test@deedpro-check.com', 'TestPassword123!')
    })
  })

  beforeEach(() => {
    // Restore session
    cy.session('user-session', () => {
      cy.login('test@deedpro-check.com', 'TestPassword123!')
    })
    
    cy.visit('/')
    cy.injectAxe()  // Accessibility testing
  })

  it('should complete wizard flow', () => {
    // Test implementation
  })
})
```

### **Custom Commands**

Located in `frontend/cypress/support/commands.js`:

```javascript
// Login (API-based for speed)
cy.login('email@example.com', 'password')

// Navigate to wizard
cy.goToWizard()

// Check accessibility
cy.injectAxe()
cy.checkA11y()

// Wait for element
cy.waitForElement('.wizard-step')
```

### **Configuration**

Three configs for different environments:

**1. Local Testing** - `cypress.config.js`
```javascript
{
  baseUrl: 'http://localhost:3000',
  env: {
    API_URL: 'https://deedpro-main-api.onrender.com'
  }
}
```

**2. Staging** - `cypress-staging.config.js`
```javascript
{
  baseUrl: 'https://deedpro-frontend-new.vercel.app',
  env: {
    API_URL: 'https://deedpro-main-api.onrender.com'
  }
}
```

**3. Phase 5** - `cypress-phase5.config.js`
```javascript
{
  baseUrl: 'https://deedpro-frontend-new.vercel.app',
  env: {
    API_URL: 'https://deedpro-main-api.onrender.com',
    SKIP_ACCESSIBILITY_CHECKS: true  // For faster runs
  }
}
```

**Run with specific config**:
```bash
npx cypress run --config-file cypress-staging.config.js
```

---

## 🔐 **AUTHENTICATION TESTING**

### **Why Authenticated Tests?**

We test with **real authentication** because:
- ✅ Tests the complete user journey
- ✅ Validates middleware & JWT handling
- ✅ Ensures protected routes work correctly
- ✅ No security bypasses in production code
- ✅ Catches auth-related bugs early

**See**: `docs/roadmap/CYPRESS_AUTH_SOLUTION.md` for full implementation details.

### **Test Credentials**

**Current Test Account**:
```yaml
Email: test@deedpro-check.com
Password: TestPassword123!
Backend: https://deedpro-main-api.onrender.com
```

**How It Works**:
1. Cypress calls API login endpoint
2. Receives JWT access token
3. Stores token in cookie (`access_token`)
4. Cookie sent with all subsequent requests
5. Middleware validates token → allows access

### **Troubleshooting Auth**

**Problem**: "401 Unauthorized" or redirect to /login

**Solutions**:
1. **Verify test user exists**:
   ```bash
   # Test login manually
   curl -X POST https://deedpro-main-api.onrender.com/users/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@deedpro-check.com","password":"TestPassword123!"}'
   ```

2. **Check cookie storage**:
   ```javascript
   // In Cypress test
   cy.getCookie('access_token').should('exist')
   ```

3. **Verify API URL**:
   ```javascript
   // Check cypress.config.js
   env: {
     API_URL: 'https://deedpro-main-api.onrender.com'  // Must be production
   }
   ```

---

## 📝 **MANUAL TESTING**

### **When to Manual Test**

- ✅ Before production deployment
- ✅ After major architecture changes
- ✅ When Cypress tests fail unexpectedly
- ✅ For UX/design validation
- ✅ For exploratory testing

### **Manual Test Checklist**

```yaml
Environment: Staging (https://deedpro-frontend-new.vercel.app)
Credentials: test@deedpro-check.com / TestPassword123!

Test Flow:
  1. Homepage
     - [ ] Loads without errors
     - [ ] Navigation visible
     - [ ] "Get Started" button works
  
  2. Login
     - [ ] Navigate to /login
     - [ ] Enter credentials
     - [ ] Successful login → redirect to dashboard
  
  3. Dashboard
     - [ ] User name displayed
     - [ ] "Create Deed" button visible
     - [ ] Navigation functional
  
  4. Document Selection (/create-deed)
     - [ ] Page loads
     - [ ] "Grant Deed" card visible
     - [ ] Shows 5 steps
     - [ ] Click card → navigates to wizard
  
  5. Grant Deed Wizard (/create-deed/grant-deed)
     - [ ] Step 1: Request Details
       - [ ] Form fields render
       - [ ] Can input data
       - [ ] "Next" button works
     - [ ] Step 2: Transfer Tax
       - [ ] Form fields render
       - [ ] Can input data
       - [ ] "Next" and "Back" work
     - [ ] Step 3: Parties & Property
       - [ ] Form fields render
       - [ ] Required fields validated
       - [ ] Can input data
     - [ ] Step 4: Review
       - [ ] All data displayed correctly
       - [ ] Can go back to edit
     - [ ] Step 5: Generate
       - [ ] "Generate PDF" button works
       - [ ] PDF downloads successfully
       - [ ] PDF contains correct data
  
  6. Error Handling
     - [ ] Invalid input shows error
     - [ ] Network errors handled gracefully
     - [ ] Missing required fields prevented
  
  7. Accessibility (Quick Check)
     - [ ] Can navigate with keyboard (Tab)
     - [ ] Focus indicators visible
     - [ ] Form labels present
     - [ ] Color contrast sufficient
```

**Time to Complete**: ~15 minutes

**Document Results**: Take screenshots and note any issues in GitHub Issues.

---

## 🐛 **TROUBLESHOOTING**

### **Frontend Tests Failing**

**Problem**: "Cannot find module" or import errors

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run test
```

---

**Problem**: "ReferenceError: window is not defined"

**Solution**: Mock browser APIs in jest.setup.js
```javascript
global.window = { location: { href: '' } }
```

---

### **Backend Tests Failing**

**Problem**: "ModuleNotFoundError" or import errors

**Solution**:
```bash
cd backend
pip install -r requirements.txt
pytest
```

---

**Problem**: Database connection errors

**Solution**: Check DATABASE_URL in `.env`
```bash
# Use SQLite for tests
DATABASE_URL=sqlite:///./test.db
pytest
```

---

### **Cypress Tests Failing**

**Problem**: "ESOCKETTIMEDOUT" - Can't connect to server

**Solution**:
1. Ensure dev server is running: `npm run dev`
2. Wait for "Ready in..." message
3. Check baseUrl in cypress.config.js matches running server

---

**Problem**: "AssertionError: Expected to find element... but never found it"

**Solution**:
1. Check if you're authenticated (cookie exists)
2. Verify page loaded correctly (take screenshot)
3. Check for JavaScript errors in browser console
4. Increase timeout: `cy.get('.element', { timeout: 10000 })`

---

**Problem**: Accessibility violations failing tests

**Solution**:
1. **For legitimate issues**: Fix the HTML/CSS
2. **For false positives**: Exclude specific rules:
   ```javascript
   cy.checkA11y(null, {
     rules: {
       'color-contrast': { enabled: false }  // If false positive
     }
   })
   ```

---

**Problem**: "401 Unauthorized" during login

**Solution**:
1. Verify test credentials are correct
2. Check API_URL in cypress.config.js
3. Test login manually:
   ```bash
   curl -X POST https://deedpro-main-api.onrender.com/users/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@deedpro-check.com","password":"TestPassword123!"}'
   ```

---

### **Test Performance Issues**

**Problem**: Tests are slow (>5 minutes)

**Solution**:
1. **Use API login** instead of UI login (96% faster)
2. **Mock external APIs** (Google, TitlePoint)
3. **Run in parallel**: `npx cypress run --parallel`
4. **Skip accessibility checks** for speed: `SKIP_ACCESSIBILITY_CHECKS=true`

---

## 📚 **REFERENCE**

### **Key Files**

- `frontend/cypress/e2e/wizard-regression-pack.cy.js` - Main E2E test suite
- `frontend/cypress/support/commands.js` - Custom Cypress commands
- `frontend/cypress.config.js` - Cypress configuration
- `frontend/jest.config.js` - Jest configuration
- `backend/pytest.ini` - Pytest configuration

### **Documentation**

- **[CYPRESS_AUTH_SOLUTION.md](./CYPRESS_AUTH_SOLUTION.md)** - Authentication implementation
- **[WIZARD_REBUILD_PLAN.md](./WIZARD_REBUILD_PLAN.md)** - Testing requirements per phase
- **[PHASE4_COMPLETION_REPORT.md](./PHASE4_COMPLETION_REPORT.md)** - QA & testing results

### **External Resources**

- [Cypress Documentation](https://docs.cypress.io)
- [Jest Documentation](https://jestjs.io)
- [Pytest Documentation](https://docs.pytest.org)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)

---

## ✅ **TESTING CHECKLIST**

Before committing code:

- [ ] All frontend unit tests passing
- [ ] All backend unit tests passing
- [ ] Cypress E2E tests passing (or documented failures)
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] Manual testing completed (if applicable)
- [ ] Accessibility checked (if UI changes)
- [ ] Performance validated (if backend changes)

Before deploying:

- [ ] All tests passing on `main` branch
- [ ] Cypress tests passed on staging
- [ ] Manual testing completed on staging
- [ ] Sign-off evidence captured
- [ ] Rollback plan documented

---

**Questions?** See `docs/ONBOARDING_NEW_AGENTS.md` or contact QA team.

---

**Last Updated**: October 1, 2025  
**Maintained By**: QA Team

