import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEBUG_CAPTURE_SESSION, DebugCaptureErrorHandler } from 'debug-capture/angular';
import { PANEL_ELEMENT_NAME } from 'debug-capture/panel';

import { provideDebugPanel, startDebugPanel } from './debug-panel';

/**
 * The test page has no `?debug=1` and no storage flag, so this is the "off"
 * path every station takes by default. The "on" path patches the page's
 * globals, so it is not run here; the package's own e2e tests cover it.
 */
describe('debug panel (off by default)', () => {
  it('startDebugPanel() starts nothing and hands Angular a null session', () => {
    const providers = startDebugPanel();

    expect(providers).toEqual([{ provide: DEBUG_CAPTURE_SESSION, useValue: null }]);
    expect(document.querySelector(PANEL_ELEMENT_NAME)).toBeNull();
  });

  it('provideDebugPanel() installs the error handler, which only delegates with no session', () => {
    TestBed.configureTestingModule({
      providers: [provideDebugPanel(), { provide: DEBUG_CAPTURE_SESSION, useValue: null }],
    });

    const handler = TestBed.inject(ErrorHandler);
    expect(handler).toEqual(jasmine.any(DebugCaptureErrorHandler));
    const logged = spyOn(console, 'error');
    handler.handleError(new Error('boom'));
    expect(logged).toHaveBeenCalled();
  });
});
