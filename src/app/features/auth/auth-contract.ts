import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * The whole shared vocabulary of the auth feature — mirrors the
 * language-neutral API contract in specs/3-login-auth/spec.md, which is the
 * source of truth. A contract change updates the spec, this file, and the
 * .NET service together.
 */

export type Mode = 'operation' | 'technician';
export type Position = 'active' | 'passive';

export interface LoginRequest {
  username: string;
  password: string;
  mode: Mode;
  position: Position;
}

export interface UserSession {
  user: { username: string; mode: Mode; position: Position };
  expiresAt: string; // ISO-8601
}

export type AuthError = 'invalid_credentials' | 'locked' | 'invalid_request';

/** Implemented by the real HTTP service and (later) the auth-free mock. */
export interface AuthApi {
  login(req: LoginRequest): Observable<UserSession>;
  logout(): Observable<void>;
  session(): Observable<UserSession>;
}

export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API');

/**
 * Endpoint URLs the HTTP implementation calls. A host app overrides them via
 * `provideAuth({...})`; the runtime config file (slice 5) can feed this token
 * later without touching the service.
 */
export interface AuthApiConfig {
  loginUrl: string;
  logoutUrl: string;
  sessionUrl: string;
}

/**
 * Defaults are relative — the contract fixes the paths, and the dev proxy or
 * the production reverse proxy resolves the host.
 */
export const DEFAULT_AUTH_API_CONFIG: AuthApiConfig = {
  loginUrl: '/api/auth/login',
  logoutUrl: '/api/auth/logout',
  sessionUrl: '/api/auth/session',
};

/** Self-defaulting: injectable without any provider, so forgetting the config is harmless. */
export const AUTH_API_CONFIG = new InjectionToken<AuthApiConfig>('AUTH_API_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_AUTH_API_CONFIG,
});
