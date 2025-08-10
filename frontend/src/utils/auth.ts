/**
 * Authentication utilities for DeedPro
 * Handles JWT token management and user authentication state
 */

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan: string;
}

export class AuthManager {
  private static readonly TOKEN_KEY = 'access_token';
  private static readonly USER_KEY = 'user_data';

  /**
   * Store authentication token and user data
   */
  static setAuth(token: string, user?: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
      if (user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
      
      // Also set as cookie for middleware access
      document.cookie = `access_token=${token}; path=/; max-age=86400; secure; samesite=strict`;
    }
  }

  /**
   * Get stored authentication token
   */
  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Get stored user data
   */
  static getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.USER_KEY);
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Check if user is currently authenticated
   */
  static isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      const token = this.getToken();
      if (!token) return false;

      try {
        // Decode JWT to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp < currentTime) {
          // Token expired, clean up
          this.logout();
          return false;
        }
        return true;
      } catch {
        // Invalid token, clean up
        this.logout();
        return false;
      }
    }
    return false;
  }

  /**
   * Logout user and clear all auth data
   */
  static logout(redirectPath?: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      
      // Clear cookie
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Redirect to login
      const loginUrl = redirectPath 
        ? `/login?redirect=${encodeURIComponent(redirectPath)}`
        : '/login';
      window.location.href = loginUrl;
    }
  }

  /**
   * Check if user is an admin
   */
  static isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  }

  /**
   * Check if user has a specific plan
   */
  static hasPlan(planName: string): boolean {
    const user = this.getUser();
    return user?.plan === planName;
  }

  /**
   * Check if user has premium access (professional or enterprise)
   */
  static hasPremiumAccess(): boolean {
    const user = this.getUser();
    return user?.plan === 'professional' || user?.plan === 'enterprise';
  }

  /**
   * Get user's plan name
   */
  static getUserPlan(): string | null {
    const user = this.getUser();
    return user?.plan || null;
  }

  /**
   * Get user's role
   */
  static getUserRole(): string | null {
    const user = this.getUser();
    return user?.role || null;
  }

  /**
   * Get user's ID
   */
  static getUserId(): number | null {
    const user = this.getUser();
    return user?.id || null;
  }
}