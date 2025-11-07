// AuthManager utility for handling authentication state
export class AuthManager {
  private static readonly TOKEN_KEY = "deedpro_auth_token"
  private static readonly USER_KEY = "deedpro_user"

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    if (typeof window === "undefined") return false
    const token = localStorage.getItem(this.TOKEN_KEY)
    return !!token
  }

  /**
   * Store authentication token and user data
   */
  static setAuth(token: string, user?: any): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.TOKEN_KEY, token)
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
    }
  }

  /**
   * Get stored authentication token
   */
  static getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.TOKEN_KEY)
  }

  /**
   * Get stored user data
   */
  static getUser(): any | null {
    if (typeof window === "undefined") return null
    const userStr = localStorage.getItem(this.USER_KEY)
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  /**
   * Clear authentication data (logout)
   */
  static clearAuth(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }
}
