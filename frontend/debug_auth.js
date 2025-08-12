// Debug script to check authentication state
console.log('=== DeedPro Auth Debug ===');

// Check localStorage
console.log('localStorage access_token:', localStorage.getItem('access_token'));
console.log('localStorage user:', localStorage.getItem('user'));

// Check cookies
console.log('All cookies:', document.cookie);

// Check for access_token cookie specifically
const cookies = document.cookie.split(';');
const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('access_token='));
console.log('access_token cookie:', accessTokenCookie);

// Test token validation (same logic as middleware)
function isDeedProToken(token) {
  try {
    if (!token || token.length <= 20) return false;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    
    const isValid = (
      payload.sub &&
      payload.email &&
      payload.exp &&
      !payload.username &&
      !payload.ownerId
    );
    
    console.log('Token validation result:', isValid);
    return isValid;
  } catch (e) {
    console.log('Token validation error:', e);
    return false;
  }
}

// Test both token sources
const localToken = localStorage.getItem('access_token');
const cookieToken = accessTokenCookie ? accessTokenCookie.split('=')[1] : null;

console.log('\n=== Token Validation ===');
console.log('localStorage token valid:', isDeedProToken(localToken));
console.log('Cookie token valid:', isDeedProToken(cookieToken));

// Check current page
console.log('\n=== Page Info ===');
console.log('Current URL:', window.location.href);
console.log('Pathname:', window.location.pathname);
