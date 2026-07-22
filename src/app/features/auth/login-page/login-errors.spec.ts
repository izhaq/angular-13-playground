import { HttpErrorResponse } from '@angular/common/http';

import { classifyLoginError } from './login-errors';

// Direct unit tests of the extracted classifier. These pin behavior that
// already exists (the component specs cover it end-to-end), so they are
// expected green from the moment they were written.
describe('classifyLoginError', () => {
  const httpError = (status: number): HttpErrorResponse =>
    new HttpErrorResponse({ status });

  it('maps 401 to invalid-credentials', () => {
    expect(classifyLoginError(httpError(401))).toBe('invalid-credentials');
  });

  it('maps 423 to locked', () => {
    expect(classifyLoginError(httpError(423))).toBe('locked');
  });

  it('maps status 0 (no connection) to unreachable', () => {
    expect(classifyLoginError(httpError(0))).toBe('unreachable');
  });

  it('maps 5xx (server broken) to unreachable', () => {
    expect(classifyLoginError(httpError(503))).toBe('unreachable');
  });

  it('maps an unmapped 4xx like 404 to unknown', () => {
    expect(classifyLoginError(httpError(404))).toBe('unknown');
  });

  it('maps a non-HttpErrorResponse error to unknown', () => {
    expect(classifyLoginError(new Error('boom'))).toBe('unknown');
  });
});
