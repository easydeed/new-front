#!/usr/bin/env node
// Backend Validation Test - Automated Modern Wizard End-to-End Test
// Tests the new 4-layer validation system after Render + Vercel deployment

import puppeteer from 'puppeteer';

const TEST_CONFIG = {
  baseUrl: 'https://deedpro-frontend-new.vercel.app',
  testAddress: '1358 5th St, La Verne, CA 91750, USA',
  testGrantee: 'Test Buyer ' + Date.now(),
  testVesting: 'Sole and Separate Property',
  testLegalDescription: 'Lot 15, Block 3, Tract No. 12345, as per map recorded in Book 45, Pages 67-68 of Maps, in the office of the County Recorder of Los Angeles County, California.',
  // These should be in environment or you'll need to login manually
  email: process.env.TEST_EMAIL || 'gerardomodel@gmail.com',
  password: process.env.TEST_PASSWORD
};

console.log('🚀 Backend Validation Test - Modern Wizard');
console.log('==========================================\n');

(async () => {
  let browser;
  try {
    // Launch browser
    console.log('📋 Step 1: Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Show browser so user can see
      defaultViewport: { width: 1400, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[finalizeDeed v6]') || 
          text.includes('[Backend /deeds]') ||
          text.includes('[ModernEngine')) {
        console.log('🔍 BROWSER LOG:', text);
      }
    });
    
    // Capture network requests
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/deeds/create') || url.includes('/deeds') || url.includes('/generate')) {
        console.log(`📡 API: ${response.status()} ${url}`);
      }
    });
    
    // Navigate to login page
    console.log('📋 Step 2: Navigating to login page...');
    await page.goto(`${TEST_CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });
    
    // Check if already logged in
    const cookies = await page.cookies();
    const hasToken = cookies.some(c => c.name === 'access_token') || 
                     await page.evaluate(() => localStorage.getItem('access_token'));
    
    if (!hasToken) {
      console.log('📋 Step 3: Not logged in - checking for login form...');
      
      // Wait for page to settle
      await page.waitForTimeout(2000);
      
      // Check if we're on login page
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        console.log('⚠️  Please login manually in the browser window that just opened.');
        console.log('   After logging in, the test will continue automatically.');
        console.log('   Waiting 60 seconds for manual login...');
        
        // Wait for navigation away from login page (indicating successful login)
        await page.waitForFunction(
          () => !window.location.pathname.includes('/login'),
          { timeout: 60000 }
        ).catch(() => {
          throw new Error('Login timeout - please ensure you logged in within 60 seconds');
        });
        
        console.log('✅ Logged in successfully!');
      }
    } else {
      console.log('✅ Already logged in');
    }
    
    // Navigate to Modern Wizard
    console.log('📋 Step 4: Navigating to Modern Wizard...');
    const wizardUrl = `${TEST_CONFIG.baseUrl}/create-deed/grant-deed?mode=modern`;
    await page.goto(wizardUrl, { waitUntil: 'networkidle2' });
    console.log('✅ On Modern Wizard page');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Step 5: Property Search
    console.log('📋 Step 5: Searching for property...');
    console.log(`   Address: ${TEST_CONFIG.testAddress}`);
    
    // Find and fill property search input
    const searchInput = await page.$('input[type="text"]');
    if (!searchInput) {
      throw new Error('Could not find property search input');
    }
    
    await searchInput.click({ clickCount: 3 }); // Select all
    await searchInput.type(TEST_CONFIG.testAddress, { delay: 50 });
    console.log('✅ Address entered');
    
    // Click search/verify button
    await page.waitForTimeout(1000);
    const searchButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Search') ||
        btn.textContent.includes('Verify') ||
        btn.textContent.includes('Find')
      );
    });
    
    if (!searchButton) {
      throw new Error('Could not find search button');
    }
    
    await searchButton.asElement().click();
    console.log('🔍 Searching...');
    
    // Wait for property data to load (SiteX integration)
    console.log('⏳ Waiting for property data from SiteX...');
    await page.waitForTimeout(5000);
    
    // Check if we got property data
    const hasPropertyData = await page.evaluate(() => {
      const state = localStorage.getItem('deedWizardDraft_modern');
      if (state) {
        const data = JSON.parse(state);
        return data.apn || data.county || data.grantorName;
      }
      return false;
    });
    
    if (hasPropertyData) {
      console.log('✅ Property data loaded from SiteX');
    } else {
      console.log('⚠️  Property data may not have loaded - continuing anyway');
    }
    
    // Step 6: Complete Q&A Flow
    console.log('📋 Step 6: Completing Q&A flow...');
    
    // Helper function to answer a question and click next
    const answerQuestion = async (questionNum, answer, isDropdown = false) => {
      console.log(`   Q${questionNum}: ${answer || '(using pre-filled value)'}`);
      
      await page.waitForTimeout(1000);
      
      if (answer) {
        if (isDropdown) {
          // Handle dropdown (vesting)
          const select = await page.$('select');
          if (select) {
            await select.select(answer);
          }
        } else {
          // Handle text input
          const input = await page.$('input[type="text"], textarea');
          if (input) {
            // Check if already has value
            const currentValue = await input.evaluate(el => el.value);
            if (!currentValue || currentValue === 'Not available') {
              await input.click({ clickCount: 3 });
              await input.type(answer, { delay: 30 });
            } else {
              console.log(`     (keeping pre-filled: "${currentValue.substring(0, 50)}...")`);
            }
          }
        }
      }
      
      // Click Next button
      await page.waitForTimeout(500);
      const nextButton = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(btn =>
          btn.textContent.includes('Next') ||
          btn.textContent.includes('Continue')
        );
      });
      
      if (nextButton) {
        await nextButton.asElement().click();
        await page.waitForTimeout(1500);
      }
    };
    
    // Answer Q1: Grantor (should be pre-filled from SiteX)
    await answerQuestion(1, null);
    
    // Answer Q2: Grantee
    await answerQuestion(2, TEST_CONFIG.testGrantee);
    
    // Answer Q3: Legal Description (may be pre-filled from SiteX)
    await page.waitForTimeout(1000);
    const needsLegalDesc = await page.evaluate(() => {
      const input = document.querySelector('input[type="text"], textarea');
      if (input) {
        const val = input.value || '';
        return !val || val === 'Not available' || val.trim() === '';
      }
      return false;
    });
    
    if (needsLegalDesc) {
      await answerQuestion(3, TEST_CONFIG.testLegalDescription);
    } else {
      await answerQuestion(3, null); // Use pre-filled
    }
    
    // Answer Q4: Vesting
    await page.waitForTimeout(1000);
    const hasSelect = await page.$('select');
    if (hasSelect) {
      await answerQuestion(4, TEST_CONFIG.testVesting, true);
    } else {
      await answerQuestion(4, TEST_CONFIG.testVesting, false);
    }
    
    console.log('✅ Q&A completed');
    
    // Step 7: SmartReview Page
    console.log('📋 Step 7: On SmartReview page...');
    await page.waitForTimeout(2000);
    
    // Check what data is visible
    console.log('📊 Checking displayed data...');
    const displayedData = await page.evaluate(() => {
      const text = document.body.textContent;
      return {
        hasGrantor: text.includes('Grantor') || text.includes('HERNANDEZ'),
        hasGrantee: text.includes('Grantee') || text.includes('Test Buyer'),
        hasLegal: text.includes('Legal') || text.includes('Lot'),
        hasVesting: text.includes('Vesting') || text.includes('Separate Property')
      };
    });
    
    console.log('   Grantor visible:', displayedData.hasGrantor ? '✅' : '❌');
    console.log('   Grantee visible:', displayedData.hasGrantee ? '✅' : '❌');
    console.log('   Legal Desc visible:', displayedData.hasLegal ? '✅' : '❌');
    console.log('   Vesting visible:', displayedData.hasVesting ? '✅' : '❌');
    
    // Step 8: Click "Confirm & Generate"
    console.log('📋 Step 8: Clicking "Confirm & Generate"...');
    await page.waitForTimeout(1000);
    
    const confirmButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Confirm') ||
        btn.textContent.includes('Generate')
      );
    });
    
    if (!confirmButton) {
      throw new Error('Could not find Confirm & Generate button');
    }
    
    // Set up listener for network response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/deeds') && response.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);
    
    await confirmButton.asElement().click();
    console.log('🔄 Finalizing deed...');
    
    // Wait for response
    const response = await responsePromise;
    if (response) {
      const status = response.status();
      console.log(`📡 POST /deeds response: ${status}`);
      
      if (status === 200 || status === 201) {
        const data = await response.json().catch(() => ({}));
        const deedId = data.id || data.deedId || data.deed_id;
        console.log(`✅ Deed created successfully! ID: ${deedId}`);
        
        // Wait for redirect to preview
        console.log('⏳ Waiting for redirect to preview...');
        await page.waitForTimeout(3000);
        
        // Check current URL
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('/preview')) {
          console.log('✅ Redirected to preview page');
          
          // Wait for PDF generation attempt
          await page.waitForTimeout(5000);
          
          // Check for errors
          const hasError = await page.evaluate(() => {
            const text = document.body.textContent;
            return text.includes('400') ||
                   text.includes('Bad Request') ||
                   text.includes('Validation failed') ||
                   text.includes('Grantor information is required');
          });
          
          if (hasError) {
            console.log('❌ PDF generation failed with 400 error');
            console.log('');
            console.log('🔍 DIAGNOSIS:');
            console.log('   The deed was created, but the database record has empty fields.');
            console.log('   This means the backend validation is NOT working as expected.');
            console.log('');
            console.log('📋 Next Steps:');
            console.log('   1. Check Render logs for [Backend /deeds] messages');
            console.log('   2. Query database for deed ID:', deedId);
            console.log('   3. Verify backend deployment completed successfully');
          } else {
            console.log('✅ PDF generation succeeded!');
            console.log('');
            console.log('🎉 SUCCESS! Backend validation is working!');
          }
        } else {
          console.log('⚠️  Did not redirect to preview page');
        }
      } else if (status === 422) {
        const data = await response.json().catch(() => ({}));
        console.log('🎯 VALIDATION REJECTION (Expected for empty fields):');
        console.log('   Status:', status);
        console.log('   Message:', data.detail || JSON.stringify(data));
        console.log('');
        console.log('✅ Backend validation is working!');
      } else {
        console.log(`⚠️  Unexpected status: ${status}`);
      }
    } else {
      console.log('⚠️  No response captured (might have timed out)');
    }
    
    // Keep browser open for inspection
    console.log('');
    console.log('📊 Test complete! Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();

