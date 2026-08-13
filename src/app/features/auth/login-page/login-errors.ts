import { HttpErrorResponse } from '@angular/common/http';

/**
 * Every failure the contract defines has a face — one honest, human message
 * per cause, wording free of blame and jargon.
 */
export type LoginErrorKind = 'invalid-credentials' | 'locked' | 'unreachable' | 'unknown';

export const LOGIN_ERROR_MESSAGES: Record<LoginErrorKind, string> = {
  'invalid-credentials': 'Wrong username or password. Please check and try again.',
  locked: 'This account is locked right now. Please try again later.',
  unreachable: 'Cannot reach the server right now. Please try again in a moment.',
  unknown: 'Something went wrong while signing in. Please try again.',
};

/**
 * Exact HTTP statuses with a known meaning:
 * - 401 → the contract's invalid_credentials.
 * - 423 → the contract's locked state, real since R1.4: the server sends it
 *   after MaxLoginAttempts consecutive failures for a username.
 * - status 0 → no connection at all → unreachable.
 */
const LOGIN_ERROR_KIND_BY_STATUS: Record<number, LoginErrorKind> = {
  401: 'invalid-credentials',
  423: 'locked',
  0: 'unreachable',
};

/**
 * Maps a login failure to its message key: the exact-status map above first,
 * then 5xx (server broken) → unreachable, then an honest generic fallback
 * (including errors that are not HTTP responses at all).
 */
export function classifyLoginError(error: unknown): LoginErrorKind {
  if (error instanceof HttpErrorResponse) {
    const exact = LOGIN_ERROR_KIND_BY_STATUS[error.status];
    if (exact !== undefined) {
      return exact;
    }
    // The one rule a finite map cannot hold: a whole status range.
    if (error.status >= 500) {
      return 'unreachable';
    }
  }
  return 'unknown';
}
