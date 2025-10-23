// Backend Validation Test - Modern Wizard End-to-End
// Tests the new 4-layer validation system after deployment

console.log('🚀 Starting Backend Validation Test...');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'https://deedpro-frontend-new.vercel.app',
  testAddress: '1358 5th St, La Verne, CA 91750, USA',
  testGrantee: 'Test Buyer ' + Date.now(),
  testVesting: 'Sole and Separate Property',
  testLegalDescription: 'Lot 15, Block 3, Tract No. 12345, as per map recorded in Book 45, Pages 67-68'
};

// Step 1: Clear old state and start fresh
console.log('📋 Step 1: Clearing old state...');
localStorage.clear();
sessionStorage.clear();

// Step 2: Navigate to Modern Wizard
console.log('📋 Step 2: Navigating to Modern Wizard...');
const wizardUrl = `${TEST_CONFIG.baseUrl}/create-deed/grant-deed?mode=modern`;
console.log('URL:', wizardUrl);

// Step 3: Wait for page load
console.log('📋 Step 3: Waiting for page load...');
setTimeout(() => {
  console.log('✅ Page loaded');
  
  // Step 4: Check if logged in
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (!token) {
    console.error('❌ Not logged in! Please login first.');
    console.log('🔗 Go to:', TEST_CONFIG.baseUrl);
    return;
  }
  console.log('✅ Authenticated');
  
  // Step 5: Start property search
  console.log('📋 Step 5: Starting property search...');
  console.log('Address:', TEST_CONFIG.testAddress);
  
  // Find property search input
  const searchInput = document.querySelector('input[type="text"][placeholder*="address" i], input[type="text"][placeholder*="property" i]');
  if (!searchInput) {
    console.error('❌ Could not find property search input');
    return;
  }
  
  // Enter address
  searchInput.value = TEST_CONFIG.testAddress;
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  searchInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  console.log('✅ Address entered');
  
  // Find and click search button
  setTimeout(() => {
    const searchButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Search') || btn.textContent.includes('Verify')
    );
    
    if (!searchButton) {
      console.error('❌ Could not find search button');
      return;
    }
    
    console.log('🔍 Clicking search button...');
    searchButton.click();
    
    // Wait for property data
    setTimeout(() => {
      console.log('📋 Step 6: Property data should be loaded');
      console.log('📋 Step 7: Starting Q&A flow...');
      console.log('⚠️ MANUAL STEPS REQUIRED:');
      console.log('1. Answer Question 1 (Grantor) - should be pre-filled from SiteX');
      console.log('2. Click Next');
      console.log('3. Answer Question 2 (Grantee):', TEST_CONFIG.testGrantee);
      console.log('4. Click Next');
      console.log('5. Answer Question 3 (Legal Description) - may be pre-filled or enter:', TEST_CONFIG.testLegalDescription);
      console.log('6. Click Next');
      console.log('7. Answer Question 4 (Vesting):', TEST_CONFIG.testVesting);
      console.log('8. Click Next');
      console.log('9. Review SmartReview page - should show ALL data');
      console.log('10. Click "Confirm & Generate"');
      console.log('');
      console.log('👀 WATCH FOR:');
      console.log('- Console logs starting with [finalizeDeed v6]');
      console.log('- Backend payload JSON should have all fields populated');
      console.log('- Success message with Deed ID');
      console.log('- NO 400 error on preview page');
      console.log('- PDF should generate successfully');
      console.log('');
      console.log('🔍 After "Confirm & Generate", check this window for logs!');
    }, 3000);
  }, 1000);
}, 1000);

// Capture finalizeDeed logs
const originalConsoleLog = console.log;
console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  if (args[0] && args[0].includes && args[0].includes('[finalizeDeed v6]')) {
    console.log('🎯 CAPTURED FINALIZE LOG:', ...args);
  }
};

console.log('✅ Test script ready! Follow the manual steps above.');
console.log('');
console.log('💡 TIP: Keep this console open to see all logs!');

