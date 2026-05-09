/**
 * Auth Manager — Password, session tokens, and CSRF for the dashboard.
 *
 * Provides:
 * - Password hashing and verification (SHA-256 based, no external deps)
 * - Session token generation and validation
 * - CSRF token generation and validation
 * - Middleware for Hono routes
 */
import { createHash, randomBytes } from "node:crypto";

// ── Types ───────────────────────────────────────────────────────────────

export interface AuthConfig {
  /** Hashed admin password (SHA-256). Default: admin */
  adminPasswordHash?: string;
  /** Session duration in milliseconds. Default: 24 hours */
  sessionDurationMs?: number;
  /** Whether auth is required (set via env or config) */
  enabled?: boolean;
}

export interface Session {
  /** Session token */
  token: string;
  /** Username (always "admin" for single-user mode) */
  username: string;
  /** Created timestamp */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** CSRF token for this session */
  csrfToken: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  csrfToken?: string;
  error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────

const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_ADMIN_PASSWORD = "admin";

// ── Auth Manager ────────────────────────────────────────────────────────

export class AuthManager {
  private passwordHash: string;
  private sessionDuration: number;
  private sessions: Map<string, Session> = new Map();
  private _enabled: boolean;

  constructor(config?: AuthConfig) {
    this.passwordHash = config?.adminPasswordHash ?? AuthManager.hashPassword(DEFAULT_ADMIN_PASSWORD);
    this.sessionDuration = config?.sessionDurationMs ?? DEFAULT_SESSION_DURATION_MS;
    this._enabled = config?.enabled ?? false; // Disabled by default for development
  }

  /** Hash a password using SHA-256 */
  static hashPassword(password: string): string {
    return createHash("sha256").update(password).digest("hex");
  }

  /** Generate a random token */
  private static generateToken(length: number = 32): string {
    return randomBytes(length).toString("hex");
  }

  /** Whether auth is enabled */
  get enabled(): boolean {
    return this._enabled;
  }

  /** Enable or disable auth */
  set enabled(value: boolean) {
    this._enabled = value;
  }

  /** Change the admin password */
  changePassword(currentPassword: string, newPassword: string): { success: boolean; error?: string } {
    if (!this.verifyPassword(currentPassword)) {
      return { success: false, error: "Current password incorrect" };
    }
    if (newPassword.length < 4) {
      return { success: false, error: "Password must be at least 4 characters" };
    }
    this.passwordHash = AuthManager.hashPassword(newPassword);
    return { success: true };
  }

  /** Verify a password against the stored hash */
  verifyPassword(password: string): boolean {
    return AuthManager.hashPassword(password) === this.passwordHash;
  }

  /** Login: verify password and create a session */
  login(username: string, password: string): AuthResult {
    if (!this.verifyPassword(password)) {
      return { success: false, error: "Invalid password" };
    }

    // Clean up expired sessions
    this.cleanupSessions();

    const token = AuthManager.generateToken();
    const csrfToken = AuthManager.generateToken(16);
    const now = Date.now();

    const session: Session = {
      token,
      username: username || "admin",
      createdAt: now,
      expiresAt: now + this.sessionDuration,
      csrfToken,
    };

    this.sessions.set(token, session);
    return { success: true, token, csrfToken };
  }

  /** Logout: remove a session */
  logout(token: string): boolean {
    return this.sessions.delete(token);
  }

  /** Validate a session token */
  validateSession(token: string): Session | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  /** Validate a CSRF token for a session */
  validateCSRF(sessionToken: string, csrfToken: string): boolean {
    const session = this.validateSession(sessionToken);
    if (!session) return false;
    return session.csrfToken === csrfToken;
  }

  /** Get session info (without validating expiry) */
  getSession(token: string): Session | undefined {
    return this.sessions.get(token);
  }

  /** List active sessions */
  listSessions(): Array<{ username: string; createdAt: number; expiresAt: number }> {
    this.cleanupSessions();
    return Array.from(this.sessions.values()).map((s) => ({
      username: s.username,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  /** Clean up expired sessions */
  private cleanupSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }

  /** Auth middleware for Hono — returns 401 if auth is enabled and no valid session */
  authMiddleware(): (c: any, next: () => Promise<void>) => Promise<Response | void> {
    return async (c: any, next: () => Promise<void>) => {
      if (!this._enabled) {
        return next();
      }

      // Skip auth for login endpoint and public assets
      const path = c.req.path;
      if (path === "/api/auth/login" || path === "/" || path.startsWith("/public/")) {
        return next();
      }

      // Check for session token in header or cookie
      const authHeader = c.req.header("Authorization");
      const token = authHeader?.replace("Bearer ", "") || c.req.query("token");

      if (!token) {
        // Check cookie
        const cookie = c.req.header("cookie") || "";
        const match = cookie.match(/tekton_session=([^;]+)/);
        if (match) {
          const session = this.validateSession(match[1]);
          if (session) return next();
        }
        return c.json({ error: "Authentication required", loginUrl: "/api/auth/login" }, 401);
      }

      const session = this.validateSession(token);
      if (!session) {
        return c.json({ error: "Invalid or expired session" }, 401);
      }

      return next();
    };
  }

  /** CSRF validation middleware for Hono — checks CSRF token on mutating requests */
  csrfMiddleware(): (c: any, next: () => Promise<void>) => Promise<Response | void> {
    return async (c: any, next: () => Promise<void>) => {
      if (!this._enabled) return next();

      // Skip CSRF for GET, HEAD, OPTIONS
      const method = c.req.method;
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        return next();
      }

      // Skip CSRF for login endpoint
      if (c.req.path === "/api/auth/login") return next();

      // Check CSRF token in header
      const csrfHeader = c.req.header("X-CSRF-Token");
      const authHeader = c.req.header("Authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (!token || !csrfHeader) {
        return c.json({ error: "CSRF token required" }, 403);
      }

      if (!this.validateCSRF(token, csrfHeader)) {
        return c.json({ error: "Invalid CSRF token" }, 403);
      }

      return next();
    };
  }

  /** Get the password hash (for config export) */
  getPasswordHash(): string {
    return this.passwordHash;
  }
}