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
