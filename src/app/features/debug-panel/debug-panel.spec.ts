import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEBUG_CAPTURE_SESSION, DebugCaptureErrorHandler } from 'debug-capture/angular';
import { PANEL_ELEMENT_NAME } from 'debug-capture/panel';

import { provideDebugPanel, startDebugPanel } from './debug-panel';

/**
 * The test page has no `?debug=1`, no storage flag and nobody presses the
 * activation shortcut, so this is the "off" path every station takes by
 * default. The "on" path patches the page's globals, so it is not run here;
 * the package's own e2e tests cover it (test/e2e/background.spec.mjs).
 */
describe('debug panel (off by default)', () => {
  it('startDebugPanel() starts nothing, is ready at once, and hands Angular a session getter that reads null', async () => {
    const start = startDebugPanel();
    await start.ready;

    expect(start.providers.length).toBe(1);
    const provider = start.providers[0] as { provide: unknown; useValue: unknown };
    expect(provider.provide).toBe(DEBUG_CAPTURE_SESSION);
    expect(typeof provider.useValue).toBe('function');
    expect((provider.useValue as () => unknown)()).toBeNull();
    expect(start.activation.active).toBeFalse();
    expect(document.querySelector(PANEL_ELEMENT_NAME)).toBeNull();
    start.activation.dispose();
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
