# Dynamic Wizard System Guide

## Overview

The DeedPro dynamic wizard is a revolutionary 3-step document creation system that uses AI-powered prompts to intelligently pull data from multiple sources and generate legal documents.

## Architecture

### Frontend Structure
```
frontend/src/app/create-deed/
├── page.tsx                 # Original wizard (legacy)
├── dynamic-page.tsx         # New dynamic wizard implementation
└── dynamic-wizard.tsx       # Reusable wizard component
```

### Backend Structure
```
backend/
├── api/
│   ├── ai_assist.py         # Prompt handling and data pulling
│   ├── property_search.py   # Enhanced property search
│   └── generate_deed.py     # Dynamic document generation
├── title_point_integration.py  # TitlePoint API service
└── templates/               # Document templates
    └── grant_deed_template.html
```

## The 3-Step Process

### Step 1: Address Verification
- User enters property address
- System validates and enriches with external data
- Auto-populates APN, county, legal description via TitlePoint

### Step 2: Document Type & Data Pulls
- Select from 6 supported document types:
  - Grant Deed
  - Quitclaim Deed  
  - Interspousal Transfer
  - Warranty Deed
  - Tax Deed
  - Property Profile Report

#### Button Prompts
Each document type provides smart button prompts:
- **Pull Vesting**: Gets current ownership and vesting information
- **Pull Grant History**: Retrieves recent deed transfers and sale prices
- **Pull Tax Roll**: Fetches assessed values and tax information
- **Pull All Data**: Comprehensive data pull for Property Profile reports

#### Custom Prompts
Users can enter natural language requests:
- "pull chain of title"
- "get lien information"
- "show ownership history"

### Step 3: Dynamic Fields & Review
- Fields appear based on document type and pulled data
- Users can review and edit all information
- Generate final PDF with one click

## Document Type Configuration

```typescript
const DOC_TYPES = {
  grant_deed: {
    label: 'Grant Deed',
    fields: ['consideration'],          // Dynamic fields to show
    buttons: ['vesting', 'grant_deed', 'tax_roll'],  // Available prompts
    required: ['granteeName', 'consideration']        // Required fields
  },
  // ... other types
};
```

## API Endpoints

### AI Assistant
```
POST /api/ai/assist
{
  "type": "vesting",                    // Button prompt type
  "docType": "grant_deed",
  "verifiedData": { ... },             // Property data from Step 1
  "currentData": { ... }               // Current form data
}
```

### Custom Prompts
```
POST /api/ai/assist
{
  "prompt": "pull chain of title",     // Natural language prompt
  "docType": "grant_deed",
  "verifiedData": { ... },
  "currentData": { ... }
}
```

### Property Search
```
POST /api/property/search
{
  "address": "123 Main St, Los Angeles, CA"
}
```

### Document Generation
```
POST /api/generate-deed
{
  "deedType": "grant_deed",
  "propertySearch": "123 Main St",
  "grantorName": "John Doe",
  "granteeName": "Jane Smith",
  // ... other fields
}
```

## Fast-Forward Logic

The system automatically advances users to the review step when:
1. All required fields for the document type are populated
2. High-confidence data is available from external sources
3. User profile indicates advanced user status

## TitlePoint Integration

### Available Data Sources
- **Vesting Information**: Current ownership, vesting type
- **Grant History**: Recent transfers, sale prices, deed types
- **Tax Information**: Assessed values, tax amounts, exemptions
- **Lien Information**: Active liens, encumbrances
- **Ownership Chain**: Complete title history

### Error Handling
- Graceful fallback when external services unavailable
- User can always proceed with manual data entry
- Clear error messages for service failures

## Template System

### Template Structure
Documents use Jinja2 templates with consistent structure:
- Header with document type and APN
- Property description section
- Parties and consideration
- Signature blocks
- Notary acknowledgment

### Dynamic Content
Templates adapt based on:
- Document type requirements
- Available data fields
- State-specific legal requirements

## User Experience Features

### Progress Indication
- Visual progress bar showing 3 steps
- Step labels: Address → Doc Type & Data → Review
- Current step highlighting

### Real-time Validation
- Field validation as user types
- Missing field indicators
- Data confidence scoring

### Smart Defaults
- Auto-population from user profile
- Recent property suggestions
- Intelligent field pre-filling

## Development Guidelines

### Adding New Document Types
1. Add to `DOC_TYPES` configuration
2. Define required fields and available prompts
3. Create template in `backend/templates/`
4. Add validation logic in `validate_document_data()`

### Extending Prompts
1. Add button type to document configuration
2. Implement handler in `handle_button_prompt()`
3. Add TitlePoint integration if needed
4. Update UI button labels

### Template Development
1. Use consistent HTML structure
2. Include all standard legal elements
3. Test with various data combinations
4. Validate PDF output quality

## Testing Strategy

### Unit Tests
- API endpoint functionality
- Template rendering
- Data validation logic

### Integration Tests
- TitlePoint service integration
- End-to-end wizard flow
- PDF generation pipeline

### User Acceptance Tests
- Document accuracy verification
- Workflow efficiency testing
- Error scenario handling

## Performance Considerations

### Caching Strategy
- Property data caching for recent searches
- Template compilation caching
- API response caching with TTL

### Optimization
- Lazy loading of heavy components
- Debounced API calls
- Parallel data fetching where possible

## Security Measures

### Data Protection
- User authentication required for all operations
- Property data encrypted in transit and at rest
- PII handling compliance

### API Security
- Rate limiting on external API calls
- Input validation and sanitization
- Error message sanitization

## Deployment Considerations

### Environment Variables
```
TITLEPOINT_API_KEY=your_api_key
TITLEPOINT_BASE_URL=https://api.titlepoint.com/v1
OPENAI_API_KEY=your_openai_key
```

### Monitoring
- API response time tracking
- Error rate monitoring
- User workflow analytics

## Future Enhancements

### Planned Features
- Voice-to-text for custom prompts
- Multi-language template support
- Advanced AI suggestions
- Bulk document processing

### Integration Roadmap
- Additional data provider integrations
- Electronic signature workflows
- Automated recording submission
- Blockchain verification

## Support and Maintenance

### Common Issues
- TitlePoint service outages → Manual entry fallback
- Template rendering errors → Check data formatting
- PDF generation failures → Verify WeasyPrint setup

### Maintenance Tasks
- Regular template updates for legal changes
- API endpoint performance monitoring
- User feedback integration
- Security vulnerability assessments
