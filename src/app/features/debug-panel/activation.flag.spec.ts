import { DEBUG_PANEL_MODE, FEATURES_URL, installActivation, panelFromBackend } from './activation.flag';

/** Option C (`--configuration panel-flag`): the backend's `debugPanel` flag decides the panel. */
describe('debug panel — backend flag (activation.flag.ts)', () => {
  const reply = (status: number, body: unknown) => () =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

  it('asks GET /api/features', async () => {
    const load = jasmine.createSpy('fetch').and.callFake(reply(200, { debugPanel: true }));
    await panelFromBackend(load);
    expect(load).toHaveBeenCalledOnceWith(FEATURES_URL);
    expect(FEATURES_URL).toBe('/api/features');
  });

  it('debugPanel: true gives a panel ({}); false, missing or not a boolean gives none', async () => {
    expect(await panelFromBackend(reply(200, { debugPanel: true }))).toEqual({});
    expect(await panelFromBackend(reply(200, { debugPanel: false }))).toBeFalse();
    expect(await panelFromBackend(reply(200, {}))).toBeFalse();
    expect(await panelFromBackend(reply(200, { debugPanel: 'yes' }))).toBeFalse();
    expect(await panelFromBackend(reply(200, null))).toBeFalse();
  });

  it('a server error gives no panel', async () => {
    expect(await panelFromBackend(reply(500, { debugPanel: true }))).toBeFalse();
  });

  it('no answer (network error) rejects — the package then shows no panel (fails closed)', async () => {
    await expectAsync(panelFromBackend(() => Promise.reject(new TypeError('offline')))).toBeRejected();
  });

  it('installs the with-panel activation, off by default; mode is "flag"', async () => {
    const handle = installActivation();
    await handle.ready;
    expect(DEBUG_PANEL_MODE).toBe('flag');
    expect(handle.active).toBeFalse();
    expect(handle.panel).toBeNull();
    handle.dispose();
  });
});
