import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { DEFAULT_POST_LOGIN_URL } from './auth-urls';

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

/**
 * Client-side route URLs the feature navigates to. A sibling of
 * `AuthApiConfig`, not part of it: endpoint URLs mirror the backend contract,
 * route URLs belong to the host app's route map. The constants behind the
 * defaults live in auth-urls.ts.
 */
export interface AuthRoutesConfig {
  /** Post-login landing route when no (valid) returnUrl exists. */
  defaultPostLoginUrl: string;
}

export const DEFAULT_AUTH_ROUTES_CONFIG: AuthRoutesConfig = {
  defaultPostLoginUrl: DEFAULT_POST_LOGIN_URL,
};

/** Self-defaulting, like AUTH_API_CONFIG. */
export const AUTH_ROUTES_CONFIG = new InjectionToken<AuthRoutesConfig>('AUTH_ROUTES_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_AUTH_ROUTES_CONFIG,
});

/** Everything a host app can hand to `provideAuth()` — endpoint + route URLs. */
export type AuthConfig = AuthApiConfig & AuthRoutesConfig;
