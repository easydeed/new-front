# 🔐 JWT Authentication Guide - DeedPro Platform

## 📋 Overview

This guide documents the JWT (JSON Web Token) authentication system used throughout the DeedPro platform, including token management, renewal processes, and troubleshooting authentication issues.

**Updated**: January 2025 - Includes lessons learned from SiteX integration authentication debugging.

---

## 🔑 **Authentication Token System**

### **Token Storage**
- **Key Name**: `access_token` (stored in localStorage)
- **Format**: JWT Bearer token
- **Scope**: Frontend authentication for all API calls
- **Expiration**: Configurable (typically 24 hours)

### **Token Usage Pattern**
```javascript
// ✅ CORRECT - Use 'access_token' key
const token = localStorage.getItem('access_token');
if (!token) {
  // Handle missing token
  throw new Error('Authentication required. Please log in again.');
}

// API call with proper authorization header
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

### **❌ Common Mistakes**
```javascript
// ❌ WRONG - Using 'token' instead of 'access_token'
const token = localStorage.getItem('token'); // This will return null!

// ❌ WRONG - Not checking if token exists
const token = localStorage.getItem('access_token');
// Direct usage without validation can cause 401 errors
```

---

## 🔄 **Token Lifecycle Management**

### **Token Acquisition**
Tokens are obtained during the login process:

```javascript
// Login endpoint response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": { ... }
}

// Store token in localStorage
localStorage.setItem('access_token', response.access_token);
```

### **Token Validation**
Always validate tokens before API calls:

```javascript
const validateToken = () => {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    console.log('🔒 No authentication token found');
    return false;
  }
  
  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('🔒 Invalid token format');
      return false;
    }
    
    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < currentTime) {
      console.log('🔒 Token expired');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('🔒 Token validation error:', error);
    return false;
  }
};
```

### **Token Renewal**
Implement automatic token renewal for seamless user experience:

```javascript
const renewTokenIfNeeded = async () => {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    // Redirect to login
    window.location.href = '/login';
    return null;
  }
  
  try {
    // Check if token is close to expiration (within 5 minutes)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    if (timeUntilExpiry < 300) { // 5 minutes
      console.log('🔄 Token expiring soon, attempting renewal...');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        console.log('✅ Token renewed successfully');
        return data.access_token;
      } else {
        console.log('❌ Token renewal failed');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return null;
      }
    }
    
    return token;
  } catch (error) {
    console.error('Token renewal error:', error);
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    return null;
  }
};
```

---

## 🚨 **Error Handling & Troubleshooting**

### **401 Unauthorized Errors**

#### **Symptoms**
- API calls return 401 status
- Console shows "SiteX AddressSearch error: 401"
- Property search fails with "Unable to search property database"

#### **Root Causes**
1. **Missing Token**: No token in localStorage
2. **Expired Token**: Token past expiration time
3. **Invalid Token**: Corrupted or malformed token
4. **Wrong Token Key**: Using 'token' instead of 'access_token'

#### **Debugging Steps**
```javascript
// 1. Check if token exists
const token = localStorage.getItem('access_token');
console.log('Token exists:', !!token);

// 2. Inspect token payload
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    console.log('Token expires:', new Date(payload.exp * 1000));
    console.log('Current time:', new Date());
  } catch (e) {
    console.log('Invalid token format');
  }
}

// 3. Test token with simple API call
const testToken = async () => {
  const response = await fetch('/api/auth/verify', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Token valid:', response.ok);
};
```

#### **Resolution Steps**
1. **Immediate Fix**: Refresh page and log in again
2. **Clear Storage**: `localStorage.removeItem('access_token')`
3. **Re-authenticate**: Navigate to `/login`
4. **Check Implementation**: Ensure using correct token key

### **Property Integration Specific Issues**

#### **SiteX Endpoint Authentication**
The SiteX two-step flow endpoints require valid JWT tokens:

```javascript
// ✅ CORRECT Implementation
const searchSitexProperties = async (addressData) => {
  // Always validate token first
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }
  
  const response = await fetch('/api/property/sitex/address-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(addressData)
  });
  
  // Handle 401 specifically
  if (response.status === 401) {
    throw new Error('Authentication expired. Please refresh the page and log in again.');
  }
  
  return response.json();
};
```

---

## 🔧 **Implementation Best Practices**

### **1. Consistent Token Key Usage**
Always use `access_token` as the localStorage key:

```javascript
// ✅ CORRECT - All components should use this pattern
const token = localStorage.getItem('access_token');

// ❌ AVOID - Inconsistent key names
const token = localStorage.getItem('token');
const token = localStorage.getItem('authToken');
const token = localStorage.getItem('jwt');
```

### **2. Centralized Authentication Utility**
Create a shared authentication utility:

```javascript
// utils/auth.ts
export class AuthService {
  private static readonly TOKEN_KEY = 'access_token';
  
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }
  
  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
  
  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }
  
  static async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const token = this.getToken();
    
    if (!token || !this.isAuthenticated()) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      this.removeToken();
      window.location.href = '/login';
      throw new Error('Authentication expired');
    }
    
    return response;
  }
}
```

### **3. Component-Level Authentication Checks**
Implement authentication checks in components:

```javascript
// Component authentication pattern
useEffect(() => {
  const checkAuth = () => {
    if (!AuthService.isAuthenticated()) {
      router.push('/login');
      return;
    }
  };
  
  checkAuth();
}, []);
```

### **4. API Call Error Handling**
Standardize error handling across all API calls:

```javascript
const handleApiError = (response: Response) => {
  if (response.status === 401) {
    AuthService.removeToken();
    window.location.href = '/login';
    throw new Error('Authentication expired. Please log in again.');
  }
  
  if (response.status === 403) {
    throw new Error('Access denied. Insufficient permissions.');
  }
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
};
```

---

## 📊 **Monitoring & Analytics**

### **Authentication Metrics**
Track authentication-related metrics:

```javascript
// Log authentication events
const logAuthEvent = (event: string, details?: any) => {
  console.log(`🔐 Auth Event: ${event}`, details);
  
  // Send to analytics if needed
  if (typeof gtag !== 'undefined') {
    gtag('event', 'auth_event', {
      event_category: 'authentication',
      event_label: event,
      custom_parameter: details
    });
  }
};

// Usage examples
logAuthEvent('token_expired');
logAuthEvent('login_success');
logAuthEvent('api_401_error', { endpoint: '/api/property/sitex/address-search' });
```

### **Token Health Monitoring**
Monitor token health across the application:

```javascript
const monitorTokenHealth = () => {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    logAuthEvent('no_token_found');
    return;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    if (timeUntilExpiry < 0) {
      logAuthEvent('token_expired', { expired_ago: Math.abs(timeUntilExpiry) });
    } else if (timeUntilExpiry < 300) {
      logAuthEvent('token_expiring_soon', { expires_in: timeUntilExpiry });
    }
  } catch (error) {
    logAuthEvent('token_parse_error', { error: error.message });
  }
};

// Run token health check periodically
setInterval(monitorTokenHealth, 60000); // Every minute
```

---

## 🔄 **Migration & Updates**

### **Updating Existing Components**
When updating components to use proper authentication:

1. **Find all localStorage.getItem() calls**
2. **Replace 'token' with 'access_token'**
3. **Add token validation**
4. **Implement proper error handling**

### **Testing Authentication**
Test authentication flows thoroughly:

```javascript
// Test scenarios
const testAuthenticationScenarios = async () => {
  // 1. Test with valid token
  localStorage.setItem('access_token', 'valid_jwt_token');
  
  // 2. Test with expired token
  localStorage.setItem('access_token', 'expired_jwt_token');
  
  // 3. Test with no token
  localStorage.removeItem('access_token');
  
  // 4. Test with malformed token
  localStorage.setItem('access_token', 'invalid_token');
  
  // Run API calls and verify proper error handling
};
```

---

## 📚 **Related Documentation**

- **Property Integration Guide**: Complete SiteX flow implementation
- **API Reference**: All authenticated endpoints
- **Troubleshooting Guide**: Common authentication issues
- **Security Guide**: Token security best practices

---

## 🎯 **Key Takeaways**

1. **Always use `access_token`** as the localStorage key
2. **Validate tokens** before making API calls
3. **Handle 401 errors** gracefully with clear user messages
4. **Implement token renewal** for better user experience
5. **Use centralized authentication utilities** for consistency
6. **Monitor authentication health** for proactive issue detection

This authentication system ensures secure, reliable access to all DeedPro platform features while providing a smooth user experience.

---

**Documentation Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: March 2025
