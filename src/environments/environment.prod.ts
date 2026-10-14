export const environment = {
  production: true,
  /**
   * Login is switched off for now: no login page, no route guard, no startup
   * session call, no user badge. The auth feature itself is untouched — set
   * this to `true` to bring it all back (the .NET auth service must then be
   * running; see README.md).
   */
  authEnabled: false,
};
