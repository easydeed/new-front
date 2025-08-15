# Dynamic Wizard Deployment Guide

## Overview

This guide covers deploying the new dynamic wizard system to production environments.

## Prerequisites

### Environment Variables

#### Backend (Render)
```env
# Existing variables (keep these)
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_...
JWT_SECRET_KEY=your-secret

# New variables for dynamic wizard
TITLEPOINT_API_KEY=your-titlepoint-key
TITLEPOINT_BASE_URL=https://api.titlepoint.com/v1
AI_ASSIST_ENABLED=true
DYNAMIC_WIZARD_ENABLED=true
```

#### Frontend (Vercel)
```env
# Existing variables (keep these)
NEXT_PUBLIC_API_URL=https://deedpro-main-api.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# New variables for dynamic wizard  
NEXT_PUBLIC_DYNAMIC_WIZARD=true
NEXT_PUBLIC_TITLEPOINT_ENABLED=true
```

## Deployment Steps

### 1. Backend Deployment (Render)

1. **Update Environment Variables**
   - Add new environment variables in Render dashboard
   - Ensure TitlePoint API key is configured
   - Enable dynamic wizard features

2. **Deploy Backend Changes**
   ```bash
   git push origin main  # Or staging branch first
   ```
   - Render will auto-deploy from the `/backend` directory
   - Monitor build logs for any errors
   - Verify new API endpoints are accessible

3. **Database Migrations** (if needed)
   - No schema changes required for current implementation
   - Existing `deeds` table supports new document types

### 2. Frontend Deployment (Vercel)

1. **Update Environment Variables**
   - Add new environment variables in Vercel dashboard
   - Enable dynamic wizard features

2. **Deploy Frontend Changes**
   ```bash
   git push origin main  # Vercel auto-deploys from /frontend
   ```
   - Monitor Vercel deployment dashboard
   - Verify new wizard pages load correctly

### 3. Feature Toggle Deployment Strategy

For safe rollout, use feature toggles:

#### Phase 1: Backend Only
```env
DYNAMIC_WIZARD_ENABLED=true
NEXT_PUBLIC_DYNAMIC_WIZARD=false  # Keep frontend disabled
```

#### Phase 2: Gradual Frontend Rollout
```env
DYNAMIC_WIZARD_ENABLED=true
NEXT_PUBLIC_DYNAMIC_WIZARD=true   # Enable for all users
```

#### Phase 3: Full Activation
- Monitor usage and performance
- Gather user feedback
- Iterate based on real-world usage

## Testing Checklist

### Backend Testing
- [ ] `/api/ai/assist` endpoint responds correctly
- [ ] `/api/property/search` returns valid data
- [ ] `/api/generate-deed` creates PDFs successfully
- [ ] TitlePoint integration works (or fails gracefully)
- [ ] Error handling for missing API keys

### Frontend Testing
- [ ] Dynamic wizard loads at `/create-deed`
- [ ] 3-step flow navigation works
- [ ] Button prompts trigger API calls
- [ ] Custom prompts are processed
- [ ] PDF generation completes successfully
- [ ] Mobile responsiveness maintained

### Integration Testing
- [ ] End-to-end document creation flow
- [ ] Property search with real addresses
- [ ] Various document types generate correctly
- [ ] User authentication works throughout flow
- [ ] Error scenarios display helpful messages

## Monitoring and Observability

### Key Metrics to Track
- API response times for new endpoints
- TitlePoint API success/failure rates
- Document generation success rates
- User completion rates through wizard steps
- Error rates and types

### Logging Strategy
- Log all TitlePoint API calls and responses
- Track custom prompt usage and effectiveness
- Monitor PDF generation performance
- Log user workflow progression

### Alerts to Configure
- TitlePoint API failures exceeding threshold
- PDF generation errors
- Increased error rates on new endpoints
- User session timeouts during wizard

## Rollback Strategy

### If Issues Arise

1. **Quick Rollback** - Environment Variables
   ```env
   DYNAMIC_WIZARD_ENABLED=false
   NEXT_PUBLIC_DYNAMIC_WIZARD=false
   ```

2. **Code Rollback** - Git Revert
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Database Rollback** - Not needed
   - No destructive schema changes
   - Existing data remains intact

### Recovery Steps
1. Identify root cause of issues
2. Apply environment variable toggle first
3. If needed, revert code changes
4. Monitor system stability
5. Plan fixes for re-deployment

## Performance Considerations

### Expected Load Increases
- Additional API calls to TitlePoint per document
- Larger payload sizes for dynamic data
- More complex PDF generation logic

### Optimization Strategies
- Implement caching for frequently accessed property data
- Use connection pooling for external API calls
- Optimize PDF generation templates
- Consider async processing for heavy operations

## Security Considerations

### API Key Management
- Rotate TitlePoint API keys regularly
- Monitor API key usage patterns
- Implement rate limiting on external calls
- Log but don't expose sensitive API responses

### User Data Protection
- Ensure property data is not cached inappropriately
- Implement proper session management
- Validate all external API responses
- Sanitize user inputs in custom prompts

## Post-Deployment Tasks

### Week 1
- [ ] Monitor error rates and performance
- [ ] Gather initial user feedback
- [ ] Verify TitlePoint integration stability
- [ ] Check PDF generation quality

### Week 2-4
- [ ] Analyze user adoption metrics
- [ ] Optimize based on performance data
- [ ] Plan additional document type support
- [ ] Gather feature enhancement requests

### Month 1+
- [ ] Evaluate TitlePoint data accuracy
- [ ] Consider additional data provider integrations
- [ ] Plan advanced AI features
- [ ] Assess ROI and user satisfaction

## Troubleshooting Common Issues

### TitlePoint API Failures
```python
# Check logs for:
TitlePointService: API call failed with status 500
TitlePointService: Authentication failed

# Solutions:
1. Verify API key configuration
2. Check TitlePoint service status
3. Implement circuit breaker pattern
4. Enable graceful fallback to manual entry
```

### PDF Generation Errors
```python
# Check logs for:
WeasyPrint: Template rendering failed
PDF generation error: Template not found

# Solutions:
1. Verify template files exist in /backend/templates
2. Check template syntax for Jinja2 errors
3. Validate data passed to templates
4. Ensure WeasyPrint dependencies installed
```

### Frontend API Call Failures
```javascript
// Check browser console for:
Failed to fetch: TypeError: NetworkError
API endpoint not found: 404

// Solutions:
1. Verify NEXT_PUBLIC_API_URL is correct
2. Check CORS configuration on backend
3. Validate API endpoint paths
4. Ensure authentication tokens are valid
```

## Success Criteria

### Technical Metrics
- 99%+ uptime for new endpoints
- <2s response time for property searches
- <5s PDF generation time
- <1% error rate on document creation

### User Experience Metrics
- >80% completion rate through wizard
- >90% user satisfaction with new flow
- 50%+ reduction in support tickets for data entry
- Increased daily document generation volume

### Business Metrics
- Reduced time-to-completion for documents
- Increased user engagement and retention
- Higher conversion rates from trial to paid
- Positive customer feedback scores
