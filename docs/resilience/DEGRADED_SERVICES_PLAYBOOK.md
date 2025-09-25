# Resiliency Playbooks for Degraded External Services

**Phase 4: Quality Assurance & Hardening**  
**Per Wizard Rebuild Plan**: Documented resiliency playbooks for degraded external services

## Overview

This document provides operational playbooks for handling degraded or failed external services in the DeedPro system. These playbooks ensure graceful degradation and maintain core functionality even when external dependencies are unavailable.

## External Service Dependencies

### 1. Google Places API
**Service**: Address autocomplete and validation  
**Impact**: Property address search functionality  
**Criticality**: Medium (has fallbacks)

### 2. TitlePoint API
**Service**: Property data enrichment (APN, legal description, ownership)  
**Impact**: Automated property data population  
**Criticality**: Medium (manual entry available)

### 3. AI Assist Service
**Service**: Document field suggestions and assistance  
**Impact**: User experience enhancement  
**Criticality**: Low (manual entry primary)

### 4. PDF Generation Service
**Service**: Document rendering and download  
**Impact**: Core deed generation functionality  
**Criticality**: High (core feature)

---

## Playbook 1: Google Places API Degradation

### Detection Indicators
- HTTP 403/429 responses (quota exceeded)
- HTTP 500+ responses (service unavailable)
- Request timeouts (>5 seconds)
- Invalid/malformed responses

### Automatic Fallback Behavior
```javascript
// Feature flag check
if (!process.env.NEXT_PUBLIC_GOOGLE_PLACES_ENABLED) {
  // Disable autocomplete, enable manual entry only
  return <ManualAddressInput />
}

// Graceful degradation on API failure
try {
  const predictions = await googlePlacesService.getPlacePredictions(request)
} catch (error) {
  console.warn('Google Places unavailable, falling back to manual entry')
  setErrorMessage('Address search not available. Please enter address manually.')
  // Continue with manual address entry
}
```

### Manual Intervention Steps
1. **Immediate (0-5 minutes)**
   - Monitor error rates in application logs
   - Verify Google API key status and quotas
   - Check Google Cloud Console for service status

2. **Short-term (5-30 minutes)**
   - If quota exceeded: increase daily quota or implement rate limiting
   - If service down: communicate to users via status banner
   - Enable manual address entry mode globally

3. **Long-term (30+ minutes)**
   - Implement caching of frequent addresses
   - Consider alternative geocoding services (Mapbox, HERE)
   - Review usage patterns to optimize quota usage

### User Experience Impact
- **Minimal**: Users can still enter addresses manually
- **Notification**: "Address search temporarily unavailable"
- **Functionality**: All core features remain available

---

## Playbook 2: TitlePoint API Degradation

### Detection Indicators
- HTTP 500+ responses from TitlePoint endpoints
- Authentication failures (HTTP 401/403)
- Request timeouts (>10 seconds)
- Partial data responses with low confidence scores

### Automatic Fallback Behavior
```javascript
// Feature flag check
if (!process.env.NEXT_PUBLIC_TITLEPOINT_ENABLED) {
  // Skip TitlePoint enrichment, use manual entry
  return { success: false, message: 'TitlePoint integration disabled' }
}

// Graceful degradation with retry logic
try {
  const enrichedData = await titlePointService.enrich(propertyData)
  if (enrichedData.confidence < 0.7) {
    // Low confidence, prompt for manual verification
    return { ...enrichedData, requiresVerification: true }
  }
} catch (error) {
  console.error('TitlePoint service unavailable:', error)
  // Continue with basic property data
  return { success: false, fallbackToManual: true }
}
```

### Manual Intervention Steps
1. **Immediate (0-5 minutes)**
   - Check TitlePoint service status dashboard
   - Verify API credentials and rate limits
   - Monitor error patterns in logs

2. **Short-term (5-30 minutes)**
   - If authentication issue: refresh API tokens
   - If rate limited: implement request throttling
   - If service down: enable manual data entry mode

3. **Long-term (30+ minutes)**
   - Implement local property data caching
   - Consider alternative property data providers
   - Review data accuracy and user feedback

### User Experience Impact
- **Moderate**: Users must manually enter property details
- **Notification**: "Property data lookup unavailable - please enter details manually"
- **Functionality**: Core deed generation still works with manual data

---

## Playbook 3: AI Assist Service Degradation

### Detection Indicators
- HTTP 500+ responses from AI endpoints
- Request timeouts (>15 seconds)
- Invalid or nonsensical AI responses
- High error rates in AI service logs

### Automatic Fallback Behavior
```javascript
// Feature flag check
if (!process.env.NEXT_PUBLIC_AI_ASSIST_ENABLED) {
  // Hide AI assist buttons, use manual entry only
  return null
}

// Graceful degradation with timeout
try {
  const suggestions = await aiAssistService.getSuggestions(prompt, { timeout: 10000 })
  if (!suggestions || suggestions.confidence < 0.8) {
    throw new Error('Low confidence AI response')
  }
} catch (error) {
  console.warn('AI Assist unavailable:', error)
  // Hide AI assist UI, continue with manual entry
  setAiAssistAvailable(false)
}
```

### Manual Intervention Steps
1. **Immediate (0-5 minutes)**
   - Check AI service health endpoints
   - Monitor response times and error rates
   - Verify API quotas and rate limits

2. **Short-term (5-30 minutes)**
   - If quota exceeded: adjust usage patterns
   - If service degraded: reduce AI assist prominence in UI
   - If completely down: disable AI features temporarily

3. **Long-term (30+ minutes)**
   - Implement AI response caching for common queries
   - Consider fallback AI providers
   - Review AI assist usage analytics

### User Experience Impact
- **Minimal**: AI assist is enhancement, not core functionality
- **Notification**: AI assist buttons hidden or disabled
- **Functionality**: All manual entry workflows unaffected

---

## Playbook 4: PDF Generation Service Degradation

### Detection Indicators
- HTTP 500+ responses from PDF generation endpoints
- PDF generation timeouts (>30 seconds)
- Corrupted or invalid PDF outputs
- Template rendering failures

### Automatic Fallback Behavior
```javascript
// Critical service - implement retry logic
const generatePDF = async (deedData, retries = 3) => {
  try {
    const response = await fetch('/api/generate/grant-deed-ca', {
      method: 'POST',
      body: JSON.stringify(deedData),
      timeout: 30000
    })
    
    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.status}`)
    }
    
    return response.blob()
  } catch (error) {
    if (retries > 0) {
      console.warn(`PDF generation failed, retrying... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 2000))
      return generatePDF(deedData, retries - 1)
    }
    
    // Final fallback: provide HTML preview
    throw new Error('PDF generation unavailable - HTML preview provided')
  }
}
```

### Manual Intervention Steps
1. **Immediate (0-5 minutes)**
   - Check PDF service health and resource usage
   - Monitor template rendering errors
   - Verify WeasyPrint/rendering dependencies

2. **Short-term (5-30 minutes)**
   - If resource exhaustion: scale PDF service instances
   - If template errors: rollback to last known good templates
   - If dependency issues: restart PDF service containers

3. **Long-term (30+ minutes)**
   - Implement PDF generation queue for high load
   - Consider alternative PDF libraries (Puppeteer, jsPDF)
   - Set up PDF service redundancy/clustering

### User Experience Impact
- **High**: PDF generation is core functionality
- **Notification**: "PDF generation temporarily unavailable - please try again"
- **Functionality**: Provide HTML preview as temporary alternative

---

## Cross-Service Monitoring & Alerting

### Health Check Endpoints
```javascript
// Implement health checks for all external services
GET /api/health/google-places
GET /api/health/titlepoint
GET /api/health/ai-assist
GET /api/health/pdf-generation

// Response format:
{
  "service": "google-places",
  "status": "healthy|degraded|unhealthy",
  "responseTime": 150,
  "lastCheck": "2025-09-25T20:30:00Z",
  "details": {
    "quotaRemaining": 8500,
    "errorRate": 0.02
  }
}
```

### Alerting Thresholds
- **Error Rate**: >5% over 5 minutes
- **Response Time**: >95th percentile over baseline
- **Availability**: <99% over 15 minutes
- **Quota Usage**: >80% of daily limit

### Dashboard Metrics
- Service availability (uptime %)
- Response time percentiles (p50, p95, p99)
- Error rates by service and endpoint
- Feature flag status and usage
- User impact metrics (fallback usage rates)

---

## Testing Resilience

### Chaos Engineering
```javascript
// Simulate service failures in test environment
describe('Service Degradation Tests', () => {
  it('should handle Google Places timeout', () => {
    cy.intercept('POST', '**/places/autocomplete', { delay: 10000 })
    // Test manual address entry fallback
  })
  
  it('should handle TitlePoint service unavailable', () => {
    cy.intercept('POST', '**/api/property/search', { statusCode: 503 })
    // Test manual property data entry
  })
  
  it('should handle PDF generation failure', () => {
    cy.intercept('POST', '**/api/generate/**', { statusCode: 500 })
    // Test error handling and retry logic
  })
})
```

### Load Testing
- Simulate high traffic scenarios
- Test service degradation under load
- Verify fallback mechanisms activate correctly
- Measure user experience impact

---

## Recovery Procedures

### Service Restoration Checklist
1. **Verify service health** via health check endpoints
2. **Gradually re-enable features** using feature flags
3. **Monitor error rates** during restoration
4. **Validate user workflows** end-to-end
5. **Update status communications** to users
6. **Document incident** for post-mortem analysis

### Communication Templates
```
Service Degradation:
"We're experiencing issues with [service]. [Fallback behavior] is available. We're working to restore full functionality."

Service Restored:
"[Service] has been restored. All features are now fully operational. Thank you for your patience."
```

---

## Continuous Improvement

### Post-Incident Actions
1. **Root cause analysis** of service failures
2. **Update playbooks** based on lessons learned
3. **Improve monitoring** and alerting thresholds
4. **Enhance fallback mechanisms** where needed
5. **Conduct team training** on new procedures

### Regular Reviews
- **Monthly**: Review service reliability metrics
- **Quarterly**: Update and test all playbooks
- **Annually**: Comprehensive resilience architecture review

This playbook ensures DeedPro maintains high availability and user experience even when external services are degraded or unavailable.
