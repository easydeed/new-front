# 🧩 DeedPro Component Reference

## 📱 Frontend Components

### **PropertySearchWithTitlePoint** 🆕
**File**: `frontend/src/components/PropertySearchWithTitlePoint.tsx`

**Purpose**: Complete address validation and property data integration component that combines Google Places autocomplete with TitlePoint property search functionality.

#### **Features**
- ✅ Google Places API autocomplete with real-time suggestions
- ✅ Address selection confirmation with visual feedback
- ✅ TitlePoint search button that appears after address selection
- ✅ Complete property data retrieval (APN, legal description, ownership)
- ✅ Loading states for both address validation and property search
- ✅ Error handling with graceful fallback to Google Places data only
- ✅ TypeScript interfaces for full type safety

#### **Props Interface**
```typescript
interface PropertySearchProps {
  onVerified: (data: PropertyData) => void;  // Called when property data is retrieved
  onError?: (error: string) => void;         // Optional error handler
  placeholder?: string;                      // Input placeholder text
  className?: string;                        // Additional CSS classes
}

interface PropertyData {
  // Google Places data
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
  placeId: string;
  
  // TitlePoint data (populated after search)
  apn?: string;                    // Assessor's Parcel Number
  county?: string;                 // County name
  legalDescription?: string;       // Property legal description
  grantorName?: string;           // Current owner name
  currentOwnerPrimary?: string;   // Primary owner
  currentOwnerSecondary?: string; // Secondary owner
}
```

#### **Usage Example**
```tsx
import PropertySearchWithTitlePoint from '../../components/PropertySearchWithTitlePoint';

function DeedWizard() {
  const handlePropertyVerified = (propertyData: PropertyData) => {
    console.log('Property data retrieved:', propertyData);
    // Auto-populate form fields
    setFormData(prev => ({ ...prev, ...propertyData }));
    // Advance to next step
    setCurrentStep(2);
  };

  return (
    <PropertySearchWithTitlePoint 
      onVerified={handlePropertyVerified}
      onError={(error) => console.error('Search failed:', error)}
      placeholder="Enter property address..."
    />
  );
}
```

#### **User Experience Flow**
1. **Address Input**: User types in address field
2. **Google Suggestions**: Real-time dropdown with address suggestions
3. **Address Selection**: User clicks on suggested address
4. **Confirmation**: Green box displays "Address Selected ✓"
5. **Search Button**: Blue button appears: "🏠 Search Property & Get Title Information"
6. **TitlePoint Search**: Button click triggers property data retrieval
7. **Data Retrieval**: Loading state while calling TitlePoint API
8. **Auto-Population**: Form fields populated with merged Google + TitlePoint data

#### **Visual States**
- **Loading**: Spinner during Google Places suggestions
- **Suggestions**: Dropdown list of address suggestions
- **Selected**: Green confirmation box with checkmark
- **Searching**: Button shows loading spinner and "Searching Property Data..."
- **Complete**: Data passed to parent component via `onVerified` callback

#### **Error Handling**
- If Google Places fails: Component shows error message
- If TitlePoint fails: Component falls back to Google Places data only
- If no address selected: Button displays error message
- Network errors: Graceful degradation with user feedback

#### **Integration Points**
- **Main Wizard**: `/create-deed/page.tsx` - Primary deed creation wizard
- **Dynamic Wizard**: `/create-deed/dynamic-wizard.tsx` - Alternative wizard implementation
- **Backend API**: Calls `/api/property/search` endpoint for TitlePoint integration

---

### **Legacy Components** (Still Available)

#### **PropertySearch**
**File**: `frontend/src/components/PropertySearch.tsx`
- Google Places autocomplete only
- No TitlePoint integration
- Used for basic address validation

#### **PropertySearchComponent**  
**File**: `frontend/src/components/PropertySearchComponent.tsx`
- Basic search with manual button
- Calls TitlePoint API but no Google Places integration
- Simplified interface

---

## 🔌 Backend Integration

### **Property Search Endpoint**
**URL**: `POST /api/property/search`

**Request Body**:
```json
{
  "fullAddress": "1358 5th St. La Verne, CA 91750",
  "street": "1358 5th St",
  "city": "La Verne", 
  "state": "CA",
  "zip": "91750",
  "placeId": "ChIJ..."
}
```

**Response**:
```json
{
  "success": true,
  "apn": "8123-015-023",
  "county": "Los Angeles",
  "brief_legal": "LOT 15 OF TRACT 12345...",
  "current_owner_primary": "JOHN DOE",
  "current_owner_secondary": "JANE DOE",
  "vesting": "JOINT TENANTS"
}
```

### **TitlePoint Services Used**
- **TitlePoint.Geo.Property**: General property information
- **TitlePoint.Geo.Owner**: Legal vesting and ownership details
- **TitlePoint.Geo.Tax**: Tax assessment information (available)
- **TitlePoint.Geo.Address**: Address validation (available)

---

## 🔄 Migration Guide

### **Upgrading from PropertySearch to PropertySearchWithTitlePoint**

**Before**:
```tsx
<PropertySearch 
  onSelect={handleAddressSelect}
  placeholder="Enter address"
/>
```

**After**:
```tsx
<PropertySearchWithTitlePoint 
  onVerified={handlePropertyVerified}
  placeholder="Enter address"
/>
```

**Key Changes**:
1. **Prop Name**: `onSelect` → `onVerified`
2. **Data Structure**: Now includes TitlePoint data in addition to Google Places
3. **User Flow**: Two-step process (address selection + property search)
4. **Enhanced Data**: Automatically includes APN, legal description, ownership info

### **Benefits of Migration**
- ✅ Complete address-to-property-data workflow
- ✅ Reduced manual data entry
- ✅ Professional-grade property information
- ✅ Consistent user experience across all wizards
- ✅ Better error handling and fallback options

---

## 🧪 Testing

### **Component Testing**
```bash
# Test Google Places integration
npm run test PropertySearchWithTitlePoint

# Test TitlePoint API calls
python backend/test_production_apis.py
```

### **Manual Testing Checklist**
- [ ] Address autocomplete suggestions appear
- [ ] Address selection shows green confirmation
- [ ] Search button appears after selection
- [ ] Loading state during TitlePoint search
- [ ] Property data successfully retrieved
- [ ] Form fields auto-populated
- [ ] Error handling works correctly
- [ ] Fallback to Google Places data if TitlePoint fails

### **Test Address**
Use this address for testing: **1358 5th St. La Verne, CA 91750**

Expected Results:
- Google Places: Valid address with full components
- TitlePoint: Property data including APN, legal description, ownership
- Auto-population: All form fields filled automatically
