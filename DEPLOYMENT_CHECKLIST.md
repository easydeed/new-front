# Dynamic Wizard Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Quality
- [ ] All tests pass locally (`python -m pytest tests/test_dynamic_wizard.py`)
- [ ] No linting errors in backend API files
- [ ] Frontend builds successfully (`npm run build`)
- [ ] No TypeScript errors in dynamic wizard components
- [ ] All imports and dependencies resolved

### ✅ Environment Configuration
- [ ] `TITLEPOINT_API_KEY` configured in Render environment
- [ ] `TITLEPOINT_BASE_URL` set correctly
- [ ] `DYNAMIC_WIZARD_ENABLED=true` in backend
- [ ] `NEXT_PUBLIC_DYNAMIC_WIZARD=true` in frontend
- [ ] All existing environment variables preserved

### ✅ Branch Status
- [ ] All changes committed to `full-pivot-and-fixes` branch
- [ ] Branch pushed to GitHub
- [ ] No merge conflicts with main branch
- [ ] All phases completed and documented

## Deployment Steps

### 1. Backend Deployment (Render)
- [ ] Update environment variables in Render dashboard
- [ ] Deploy from `full-pivot-and-fixes` branch
- [ ] Monitor build logs for errors
- [ ] Verify all new API endpoints are accessible:
  - [ ] `/api/ai/assist` responds
  - [ ] `/api/property/search` responds  
  - [ ] `/api/generate-deed` responds
- [ ] Test TitlePoint integration (or graceful failure)

### 2. Frontend Deployment (Vercel)
- [ ] Update environment variables in Vercel dashboard
- [ ] Deploy from `full-pivot-and-fixes` branch
- [ ] Verify dynamic wizard pages load:
  - [ ] `/create-deed` shows new wizard
  - [ ] Step navigation works
  - [ ] API calls connect to backend
- [ ] Test on mobile and desktop

### 3. Database Verification
- [ ] No migration required (existing schema compatible)
- [ ] Deed generation saves to existing `deeds` table
- [ ] User authentication still works
- [ ] No data corruption from changes

## Post-Deployment Testing

### ✅ Functional Testing
- [ ] **Address Search**: Enter valid address → gets enriched data
- [ ] **Document Type Selection**: All 6 types available and selectable
- [ ] **Button Prompts**: Each prompt type returns data or graceful error
- [ ] **Custom Prompts**: Natural language processing works
- [ ] **PDF Generation**: All document types generate valid PDFs
- [ ] **Error Handling**: Invalid inputs show helpful messages

### ✅ Integration Testing
- [ ] **TitlePoint Integration**: Real API calls work (if key available)
- [ ] **Fallback Behavior**: System works when TitlePoint unavailable
- [ ] **Authentication**: Login required and working throughout flow
- [ ] **Data Persistence**: Generated deeds save to database
- [ ] **Cross-browser**: Works in Chrome, Firefox, Safari, Edge

### ✅ Performance Testing
- [ ] **Page Load Times**: < 3s for wizard initialization
- [ ] **API Response Times**: < 2s for property search
- [ ] **PDF Generation**: < 5s for document creation
- [ ] **Memory Usage**: No memory leaks during extended use
- [ ] **Concurrent Users**: System handles multiple simultaneous users

### ✅ User Experience Testing
- [ ] **Workflow Completion**: Users can complete end-to-end flow
- [ ] **Error Recovery**: Users can recover from errors gracefully
- [ ] **Mobile Experience**: Touch-friendly and responsive
- [ ] **Accessibility**: Screen reader compatible
- [ ] **Loading States**: Clear indicators during async operations

## Monitoring Setup

### ✅ Backend Monitoring
- [ ] API endpoint response time alerts
- [ ] Error rate monitoring for new endpoints
- [ ] TitlePoint API call success/failure tracking
- [ ] Database query performance monitoring
- [ ] Memory and CPU usage tracking

### ✅ Frontend Monitoring
- [ ] Page load performance tracking
- [ ] JavaScript error monitoring
- [ ] User flow completion rates
- [ ] Browser compatibility tracking
- [ ] Mobile vs desktop usage analytics

### ✅ Business Metrics
- [ ] Document generation volume tracking
- [ ] User adoption rate of new wizard
- [ ] Support ticket volume monitoring
- [ ] User satisfaction feedback collection
- [ ] Conversion rate impact measurement

## Rollback Plan

### If Critical Issues Arise

#### Option 1: Environment Variable Rollback (Fastest)
```env
DYNAMIC_WIZARD_ENABLED=false
NEXT_PUBLIC_DYNAMIC_WIZARD=false
```
- **Recovery Time**: 2-5 minutes
- **Impact**: Reverts to original wizard
- **Risk**: Low

#### Option 2: Branch Rollback (If Code Issues)
```bash
git checkout main
git push origin main
```
- **Recovery Time**: 5-10 minutes  
- **Impact**: Full code revert
- **Risk**: Medium

#### Option 3: Vercel/Render Rollback (If Deploy Issues)
- Use platform rollback features
- **Recovery Time**: 1-3 minutes
- **Impact**: Previous working version
- **Risk**: Low

### Rollback Decision Matrix
| Issue Type | Severity | Recommended Action |
|------------|----------|-------------------|
| API errors | High | Environment variable rollback |
| Frontend crashes | High | Branch rollback |
| Performance issues | Medium | Monitor and optimize |
| Minor UI bugs | Low | Fix forward |
| TitlePoint issues | Low | Service works without it |

## Success Criteria

### ✅ Technical Success
- [ ] 99%+ uptime for new endpoints
- [ ] < 2s average response time for property searches  
- [ ] < 5s average PDF generation time
- [ ] < 1% error rate on document creation
- [ ] No increase in overall system errors

### ✅ User Success  
- [ ] > 80% completion rate through new wizard
- [ ] > 90% user satisfaction (if feedback collected)
- [ ] 50%+ reduction in data entry time
- [ ] Increased daily document generation volume
- [ ] Positive user feedback about new flow

### ✅ Business Success
- [ ] No increase in support tickets
- [ ] Maintained or improved conversion rates
- [ ] User engagement metrics improve
- [ ] System scalability maintained
- [ ] ROI positive within 30 days

## Communication Plan

### ✅ Internal Team
- [ ] Notify team of deployment start
- [ ] Share monitoring dashboard access
- [ ] Document any issues encountered
- [ ] Provide success metrics summary
- [ ] Schedule post-deployment review

### ✅ Users (if applicable)
- [ ] Announce new features (optional)
- [ ] Provide quick start guide (optional) 
- [ ] Set up feedback collection
- [ ] Monitor support channels
- [ ] Address user questions promptly

## Documentation Updates

### ✅ Technical Documentation
- [ ] Update API documentation
- [ ] Add new endpoint examples
- [ ] Document environment variables
- [ ] Update architecture diagrams
- [ ] Record deployment lessons learned

### ✅ User Documentation
- [ ] Update user guides (if needed)
- [ ] Create feature announcement
- [ ] Update FAQ with new capabilities
- [ ] Document new document types
- [ ] Update support knowledge base

## Final Verification

### ✅ System Health Check
- [ ] All original functionality still works
- [ ] New functionality is operational
- [ ] Performance metrics within acceptable ranges
- [ ] No security vulnerabilities introduced
- [ ] Monitoring and alerting active

### ✅ Sign-off
- [ ] Technical lead approval: ________________
- [ ] Product owner approval: ________________  
- [ ] DevOps verification: ________________
- [ ] Deployment date/time: ________________
- [ ] Next review scheduled: ________________

---

## Emergency Contacts

**Technical Issues:**
- Backend: [Developer Name] - [Contact]
- Frontend: [Developer Name] - [Contact]  
- DevOps: [Engineer Name] - [Contact]

**Business Issues:**
- Product Owner: [Name] - [Contact]
- Customer Support: [Team] - [Contact]

---

**Deployment Completed By:** ________________  
**Date:** ________________  
**Success Rating (1-10):** ________________  
**Issues Encountered:** ________________  
**Next Steps:** ________________
