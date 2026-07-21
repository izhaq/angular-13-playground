/**
 * Route URLs of the auth feature — the client-side navigation vocabulary,
 * in one dedicated place. Deliberately separate from the endpoint URLs
 * (`AuthApiConfig` in auth-contract.ts): endpoints mirror the backend HTTP
 * contract, route URLs belong to the host app's route map — different
 * owners, different reasons to change.
 */

/** Route-config path segment of the login page — what the host app registers. */
export const LOGIN_PATH = 'login';

/**
 * Absolute login URL — the redirect target of the guard (and, in slice 3,
 * the 401 interceptor). Derived from LOGIN_PATH so the registered route and
 * the redirect target can never drift apart.
 */
export const LOGIN_URL = `/${LOGIN_PATH}`;

/**
 * Where login lands when no (valid) returnUrl exists — the playground's home
 * screen. A host app overrides it via `provideAuth({ defaultPostLoginUrl })`.
 */
export const DEFAULT_POST_LOGIN_URL = '/system-experiments';
