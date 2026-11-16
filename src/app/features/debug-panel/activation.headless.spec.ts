import { DEBUG_PANEL_MODE, installActivation } from './activation.headless';

/** Option B (`--configuration headless`): the same handle, never a panel. */
describe('debug panel — headless (activation.headless.ts)', () => {
  it('installs the headless activation, off by default, with no panel; mode is "headless"', async () => {
    const handle = installActivation();
    await handle.ready;
    expect(DEBUG_PANEL_MODE).toBe('headless');
    expect(handle.active).toBeFalse();
    expect(handle.panel).toBeNull();
    expect(handle.panelError).toBeNull();
    handle.dispose();
  });
});
