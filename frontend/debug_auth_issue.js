/**
 * Debug script to check authentication issue
 * Run this in browser console when experiencing dashboard logout issue
 */

console.log('=== AUTHENTICATION DEBUG ===');

// Check token in localStorage
const token = localStorage.getItem('access_token');
console.log('Token exists:', !!token);

if (token) {
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 50) + '...');
  
  try {
    // Decode token
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    
    // Check expiration
    const currentTime = Date.now() / 1000;
    const isExpired = payload.exp < currentTime;
    console.log('Current time:', currentTime);
    console.log('Token expires at:', payload.exp);
    console.log('Token expired:', isExpired);
    
    if (isExpired) {
      console.log('⚠️ TOKEN IS EXPIRED - This is why logout is happening!');
      const expiredMinutesAgo = Math.floor((currentTime - payload.exp) / 60);
      console.log(`Token expired ${expiredMinutesAgo} minutes ago`);
    } else {
      const expiresInMinutes = Math.floor((payload.exp - currentTime) / 60);
      console.log(`✅ Token is valid, expires in ${expiresInMinutes} minutes`);
    }
    
  } catch (e) {
    console.log('❌ Error decoding token:', e);
    console.log('Token might be malformed');
  }
}

// Check cookie
const cookies = document.cookie;
console.log('All cookies:', cookies);

const accessTokenCookie = document.cookie
  .split('; ')
  .find(row => row.startsWith('access_token='))
  ?.split('=')[1];

console.log('Cookie token exists:', !!accessTokenCookie);
console.log('localStorage and cookie match:', token === accessTokenCookie);

// Test AuthManager functions
console.log('AuthManager.isAuthenticated():', typeof AuthManager !== 'undefined' ? AuthManager.isAuthenticated() : 'AuthManager not loaded');
console.log('AuthManager.getUser():', typeof AuthManager !== 'undefined' ? AuthManager.getUser() : 'AuthManager not loaded');

console.log('=== END DEBUG ===');
