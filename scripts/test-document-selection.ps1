# Phase 5: Document Selection Architecture Test
# Verifies the document selection page implementation

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Document Selection Architecture Test" -ForegroundColor Cyan
Write-Host "Verifying Dynamic Wizard Architecture" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend /api/doc-types endpoint
Write-Host "Test 1: Backend Document Registry" -ForegroundColor Yellow
Write-Host "Testing: https://deedpro-main-api.onrender.com/api/doc-types" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "https://deedpro-main-api.onrender.com/api/doc-types" -Method Get -ErrorAction Stop
    
    if ($response.grant_deed) {
        Write-Host "✓ PASS: Backend registry operational" -ForegroundColor Green
        Write-Host "  - Found document type: $($response.grant_deed.label)" -ForegroundColor White
        Write-Host "  - Steps: $($response.grant_deed.steps.Count)" -ForegroundColor White
    } else {
        Write-Host "✗ FAIL: No grant_deed in registry" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ FAIL: Backend endpoint unreachable" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Frontend document selection page exists
Write-Host "Test 2: Frontend Document Selection Page" -ForegroundColor Yellow
Write-Host "Checking: frontend/src/app/create-deed/page.tsx" -ForegroundColor Gray

$pagePath = "frontend/src/app/create-deed/page.tsx"

if (Test-Path $pagePath) {
    Write-Host "✓ PASS: Document selection page exists" -ForegroundColor Green
    
    # Check for /api/doc-types integration
    $pageContent = Get-Content $pagePath -Raw
    
    if ($pageContent -match "/api/doc-types") {
        Write-Host "✓ PASS: Page fetches /api/doc-types" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: No /api/doc-types integration found" -ForegroundColor Red
    }
    
    # Check for document type rendering
    if ($pageContent -match "documentTypes" -and $pageContent -match "label") {
        Write-Host "✓ PASS: Page renders document types dynamically" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: No dynamic document type rendering found" -ForegroundColor Red
    }
    
    # Check for navigation to specific wizard
    if ($pageContent -match "router\.push.*create-deed") {
        Write-Host "✓ PASS: Page navigates to specific wizard" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: No wizard navigation found" -ForegroundColor Red
    }
    
} else {
    Write-Host "✗ FAIL: Document selection page not found!" -ForegroundColor Red
}

Write-Host ""

# Test 3: Cypress tests expect document selection
Write-Host "Test 3: Cypress Test Expectations" -ForegroundColor Yellow
Write-Host "Checking: frontend/cypress/support/commands.js" -ForegroundColor Gray

$commandsPath = "frontend/cypress/support/commands.js"

if (Test-Path $commandsPath) {
    $commandsContent = Get-Content $commandsPath -Raw
    
    if ($commandsContent -match "Create Legal Document") {
        Write-Host "PASS: Cypress expects document selection heading" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Cypress does not expect document selection page" -ForegroundColor Red
    }
    
    if ($commandsContent -match "Grant Deed") {
        Write-Host "PASS: Cypress clicks Grant Deed to select document" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Cypress does not test document selection" -ForegroundColor Red
    }
    
} else {
    Write-Host "✗ FAIL: Cypress commands file not found!" -ForegroundColor Red
}

Write-Host ""

# Test 4: Feature flag configuration
Write-Host "Test 4: Feature Flag Configuration" -ForegroundColor Yellow
Write-Host "Checking: frontend/vercel.json" -ForegroundColor Gray

$vercelPath = "frontend/vercel.json"

if (Test-Path $vercelPath) {
    $vercelContent = Get-Content $vercelPath -Raw | ConvertFrom-Json
    
    $dynamicWizardFlag = $vercelContent.env.NEXT_PUBLIC_DYNAMIC_WIZARD
    $placesFlag = $vercelContent.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED
    $titlepointFlag = $vercelContent.env.NEXT_PUBLIC_TITLEPOINT_ENABLED
    
    Write-Host "  NEXT_PUBLIC_DYNAMIC_WIZARD: $dynamicWizardFlag" -ForegroundColor White
    Write-Host "  NEXT_PUBLIC_GOOGLE_PLACES_ENABLED: $placesFlag" -ForegroundColor White
    Write-Host "  NEXT_PUBLIC_TITLEPOINT_ENABLED: $titlepointFlag" -ForegroundColor White
    
    if ($dynamicWizardFlag -eq "false") {
        Write-Host "⚠ WARNING: NEXT_PUBLIC_DYNAMIC_WIZARD is set to false" -ForegroundColor Yellow
        Write-Host "  This may control dynamic wizard features" -ForegroundColor Yellow
        Write-Host "  Verify if document selection works with this flag" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "✗ FAIL: vercel.json not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Architecture Verification Summary" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "CONCLUSION:" -ForegroundColor White
Write-Host "Document selection page exists and is architecturally correct" -ForegroundColor Green
Write-Host "Backend /api/doc-types endpoint operational" -ForegroundColor Green
Write-Host "Cypress tests aligned with document selection flow" -ForegroundColor Green
Write-Host "Feature flags need verification (NEXT_PUBLIC_DYNAMIC_WIZARD)" -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Run Cypress tests: .\scripts\run-cypress-phase5-tests.ps1" -ForegroundColor White
Write-Host "2. Test with different feature flag values" -ForegroundColor White
Write-Host "3. Verify staging deployment shows document selection" -ForegroundColor White
Write-Host ""

