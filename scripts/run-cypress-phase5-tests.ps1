# Phase 5: Cypress Test Execution Script
# Runs Cypress tests with proper server setup

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Phase 5: Cypress Test Execution" -ForegroundColor Cyan
Write-Host "Architecture Verification Testing" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if frontend directory exists
if (-not (Test-Path "frontend")) {
    Write-Host "ERROR: frontend directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Checking if dev server is running..." -ForegroundColor Yellow
Write-Host ""

# Check if port 3000 is in use (dev server running)
$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "✓ Dev server detected on port 3000" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Step 2: Running Cypress tests..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location frontend
    
    # Run Cypress tests
    Write-Host "Executing wizard-regression-pack.cy.js..." -ForegroundColor Cyan
    npx cypress run --spec cypress/e2e/wizard-regression-pack.cy.js --reporter json --reporter-options output=cypress-results.json
    
    $cypressExitCode = $LASTEXITCODE
    
    if ($cypressExitCode -eq 0) {
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Green
        Write-Host "✓ ALL CYPRESS TESTS PASSED!" -ForegroundColor Green
        Write-Host "===============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Review test results in frontend/cypress-results.json" -ForegroundColor White
        Write-Host "2. Check screenshots in frontend/cypress/screenshots/" -ForegroundColor White
        Write-Host "3. Check videos in frontend/cypress/videos/" -ForegroundColor White
        Write-Host "4. Update PHASE5_CYPRESS_SIGNOFF_EVIDENCE.md" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Red
        Write-Host "✗ CYPRESS TESTS FAILED" -ForegroundColor Red
        Write-Host "===============================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Investigate failures before proceeding to Phase 5 deployment" -ForegroundColor Yellow
        Write-Host "Review:" -ForegroundColor Cyan
        Write-Host "- frontend/cypress/screenshots/ for failure screenshots" -ForegroundColor White
        Write-Host "- frontend/cypress/videos/ for test videos" -ForegroundColor White
        Write-Host "- Console output above for error messages" -ForegroundColor White
        Write-Host ""
    }
    
    Set-Location ..
    exit $cypressExitCode
    
} else {
    Write-Host "✗ Dev server not detected on port 3000" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the dev server first:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Terminal 1:" -ForegroundColor Cyan
    Write-Host "  cd frontend" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "  Then run this script again in Terminal 2" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Alternative: Run Cypress interactively" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor White
    Write-Host "  npx cypress open" -ForegroundColor White
    Write-Host ""
    exit 1
}

