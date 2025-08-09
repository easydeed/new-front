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
   * Get authentication token
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
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Basic JWT validation - check if it's not expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        // Token is expired, clear it
        this.clearAuth();
        return false;
      }
      
      return true;
    } catch (error) {
      // Invalid token format
      this.clearAuth();
      return false;
    }
  }

  /**
   * Clear all authentication data
   */
  static clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      
      // Clear cookie
      document.cookie = 'access_token=; path=/; max-age=0; secure; samesite=strict';
    }
  }

  /**
   * Get authorization header for API requests
   */
  static getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Logout user and redirect to login
   */
  static logout(redirectPath?: string): void {
    this.clearAuth();
    
    if (typeof window !== 'undefined') {
      const loginUrl = redirectPath 
        ? `/login?redirect=${encodeURIComponent(redirectPath)}`
        : '/login';
      window.location.href = loginUrl;
    }
  }

  /**
   * Check if user has admin role
   */
  static isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  }

  /**
   * Check if user has specific plan
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
}

/**
 * Higher-order component for protecting routes
 */
export function withAuth<T extends object>(
  WrappedComponent: React.ComponentType<T>
): React.ComponentType<T> {
  return function AuthenticatedComponent(props: T) {
    React.useEffect(() => {
      if (!AuthManager.isAuthenticated()) {
        AuthManager.logout(window.location.pathname);
      }
    }, []);

    if (!AuthManager.isAuthenticated()) {
      return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * React hook for authentication state
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = () => {
      const authenticated = AuthManager.isAuthenticated();
      const userData = AuthManager.getUser();
      
      setIsAuthenticated(authenticated);
      setUser(userData);
      setLoading(false);
    };

    checkAuth();
    
    // Listen for storage changes (logout in another tab)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    login: AuthManager.setAuth,
    logout: AuthManager.logout,
    isAdmin: AuthManager.isAdmin,
    hasPlan: AuthManager.hasPlan,
    hasPremiumAccess: AuthManager.hasPremiumAccess
  };
}

// For Next.js imports
import React from 'react';
