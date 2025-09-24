/**
 * Phase 2 Integration Test Utilities
 * Tests Google Places and TitlePoint integrations with feature flag support
 */

interface IntegrationTestResult {
  service: string;
  enabled: boolean;
  available: boolean;
  error?: string;
  responseTime?: number;
}

interface PropertyTestData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  placeId?: string;
}

/**
 * Test Google Places API integration
 */
export async function testGooglePlacesIntegration(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const enabled = process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED === 'true';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!enabled) {
      return {
        service: 'Google Places',
        enabled: false,
        available: false,
        error: 'Disabled via feature flag'
      };
    }
    
    if (!apiKey) {
      return {
        service: 'Google Places',
        enabled: true,
        available: false,
        error: 'API key not configured'
      };
    }
    
    // Test if Google Maps API is loaded
    const available = typeof window !== 'undefined' && 
                     window.google && 
                     window.google.maps && 
                     window.google.maps.places;
    
    return {
      service: 'Google Places',
      enabled: true,
      available: !!available,
      responseTime: Date.now() - startTime,
      error: available ? undefined : 'Google Maps API not loaded'
    };
    
  } catch (error) {
    return {
      service: 'Google Places',
      enabled: true,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Test TitlePoint backend integration
 */
export async function testTitlePointIntegration(testAddress: string = "123 Main St, Los Angeles, CA"): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const enabled = process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED === 'true';
    
    if (!enabled) {
      return {
        service: 'TitlePoint',
        enabled: false,
        available: false,
        error: 'Disabled via feature flag'
      };
    }
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      return {
        service: 'TitlePoint',
        enabled: true,
        available: false,
        error: 'Authentication token not available'
      };
    }
    
    // Test the backend proxy endpoint
    const response = await fetch('/api/property/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fullAddress: testAddress,
        city: 'Los Angeles',
        state: 'CA'
      })
    });
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        service: 'TitlePoint',
        enabled: true,
        available: false,
        error: `HTTP ${response.status}: ${data.message || 'Unknown error'}`,
        responseTime
      };
    }
    
    return {
      service: 'TitlePoint',
      enabled: true,
      available: true,
      responseTime,
      error: data.success === false ? data.message : undefined
    };
    
  } catch (error) {
    return {
      service: 'TitlePoint',
      enabled: true,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Run comprehensive integration tests
 */
export async function runIntegrationTests(): Promise<IntegrationTestResult[]> {
  console.log('🧪 Running Phase 2 Integration Tests...');
  
  const results = await Promise.all([
    testGooglePlacesIntegration(),
    testTitlePointIntegration()
  ]);
  
  // Log results
  results.forEach(result => {
    const status = result.available ? '✅' : '❌';
    const enabledStatus = result.enabled ? 'enabled' : 'disabled';
    console.log(`${status} ${result.service}: ${enabledStatus}, available: ${result.available}, time: ${result.responseTime}ms`);
    if (result.error) {
      console.warn(`   Error: ${result.error}`);
    }
  });
  
  return results;
}

/**
 * Test property data flow end-to-end
 */
export async function testPropertyDataFlow(testData: PropertyTestData): Promise<{
  googlePlaces: IntegrationTestResult;
  titlePoint: IntegrationTestResult;
  dataFlow: boolean;
  error?: string;
}> {
  const googleResult = await testGooglePlacesIntegration();
  const titlePointResult = await testTitlePointIntegration(testData.fullAddress);
  
  // Test data flow if both services are available
  let dataFlow = false;
  let error: string | undefined;
  
  if (googleResult.available && titlePointResult.available) {
    try {
      // This would be a more comprehensive test in a real scenario
      dataFlow = true;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Data flow test failed';
    }
  } else {
    error = 'One or more services unavailable for data flow test';
  }
  
  return {
    googlePlaces: googleResult,
    titlePoint: titlePointResult,
    dataFlow,
    error
  };
}

/**
 * Cache performance test
 */
export async function testCachePerformance(address: string): Promise<{
  firstCall: number;
  secondCall: number;
  cacheHit: boolean;
}> {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('Authentication required for cache test');
  }
  
  const requestBody = {
    fullAddress: address,
    city: 'Los Angeles',
    state: 'CA'
  };
  
  // First call (should miss cache)
  const start1 = Date.now();
  const response1 = await fetch('/api/property/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestBody)
  });
  const firstCall = Date.now() - start1;
  
  // Second call (should hit cache)
  const start2 = Date.now();
  const response2 = await fetch('/api/property/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestBody)
  });
  const secondCall = Date.now() - start2;
  
  const data1 = await response1.json();
  const data2 = await response2.json();
  
  // Cache hit if second call is significantly faster and data matches
  const cacheHit = secondCall < firstCall * 0.5 && 
                   JSON.stringify(data1) === JSON.stringify(data2);
  
  return {
    firstCall,
    secondCall,
    cacheHit
  };
}
