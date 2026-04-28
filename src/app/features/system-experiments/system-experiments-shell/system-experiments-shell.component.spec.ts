import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { SystemExperimentsModule } from '../system-experiments.module';
import {
  SYSTEM_EXPERIMENTS_API_CONFIG,
  SYSTEM_EXPERIMENTS_WS_FACTORY,
  SystemExperimentsWebSocketFactory,
} from '../api/api-tokens';
import { SystemExperimentsApiConfig, SystemExperimentsResponse } from '../api/api-contract';
import { SystemExperimentsApiService } from '../api/system-experiments-api.service';
import { SystemExperimentsDataService } from '../api/system-experiments-data.service';
import { SystemExperimentsShellComponent } from './system-experiments-shell.component';
import { buildPrimaryCommandsDefaults } from '../boards/primary-commands/primary-commands.fields';
import { buildSecondaryCommandsDefaults } from '../boards/secondary-commands/secondary-commands.fields';
import { CMD_ALL_SELECTED } from '../components/cmd-section/cmd-options';
import { NORMAL_FORCED, TFF, YES_NO } from '../shared/option-values';

/**
 * Post-Phase-8 shell tests. The shell now owns chrome + cross-board
 * state only — per-board logic (apply, cancel, defaults, snapshot
 * commit, payload composition, setEnabled) lives behind two
 * services, each with its own spec.
 *
 * What this suite asserts: composition + dispatch + cross-board
 * fan-out. Specifically:
 *   - both services are wired and exposed under `primary` / `secondary`
 *   - `applyDisabled` reflects CMD scope completeness
 *   - `onActive*` routes the footer event to the active service
 *   - `onActiveApply` commits `cmdSaved` ONLY on success (the only
 *     piece of cross-board state the shell owns relative to Apply)
 *   - tab switch resets the leaving tab via `activeBoard.cancel()`
 *   - test-mode fans out to both services
 *
 * What this suite intentionally does NOT re-test: per-board action
 * mechanics (snapshot semantics, payload field set, defaults shape).
 * Those live in `*-board.service.spec.ts` where they belong, and
 * pinning them here too would make the suite re-fail on every service
 * change for no diagnostic gain.
 *
 * `SystemExperimentsDataService` is stubbed with a manual subject so
 * the spec controls when grid frames arrive without spinning up real
 * timers/WS.
 */
describe('SystemExperimentsShellComponent', () => {

  const TEST_API_CONFIG: SystemExperimentsApiConfig = {
    primaryPostUrl:   '/api/test/primary',
    secondaryPostUrl: '/api/test/secondary',
    defaultUrl:       '/api/test/default',
    testModeUrl:      '/api/test/test-mode',
    getUrl:           '/api/test/get',
    wsUrl:            'ws://test/ws',
  };

  let fixture: ComponentFixture<SystemExperimentsShellComponent>;
  let component: SystemExperimentsShellComponent;
  let apiSpy: jasmine.SpyObj<SystemExperimentsApiService>;
  let frames$: Subject<SystemExperimentsResponse>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<SystemExperimentsApiService>('SystemExperimentsApiService', [
      'postPrimary',
      'postSecondary',
      'postDefault',
      'postTestMode',
    ]);
    // Microtask-resolved success keeps tests synchronous-ish without
    // requiring `fakeAsync` everywhere — `await Promise.resolve()` is
    // enough to flush the subscribe callback.
    const asyncOk = () => {
      const s = new Subject<void>();
      queueMicrotask(() => { s.next(); s.complete(); });
      return s.asObservable();
    };
    apiSpy.postPrimary.and.callFake(asyncOk);
    apiSpy.postSecondary.and.callFake(asyncOk);
    apiSpy.postDefault.and.callFake(asyncOk);
    apiSpy.postTestMode.and.callFake(asyncOk);

    frames$ = new Subject<SystemExperimentsResponse>();
    const dataStub: Partial<SystemExperimentsDataService> = {
      connect: () => frames$.asObservable(),
    };

    const noopWs: SystemExperimentsWebSocketFactory = () => new Subject<SystemExperimentsResponse>().asObservable();

    await TestBed.configureTestingModule({
      imports: [
        SystemExperimentsModule,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: SYSTEM_EXPERIMENTS_API_CONFIG, useValue: TEST_API_CONFIG },
        { provide: SYSTEM_EXPERIMENTS_WS_FACTORY, useValue: noopWs },
        { provide: SystemExperimentsApiService, useValue: apiSpy },
        { provide: SystemExperimentsDataService, useValue: dataStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SystemExperimentsShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ---------------------------------------------------------------------------
  // Initial composition — both services are wired and reach default state.
  // ---------------------------------------------------------------------------

  it('composes both per-board services and exposes them under `primary` / `secondary`', () => {
    expect(component.primary).toBeTruthy();
    expect(component.secondary).toBeTruthy();
    expect(component.primary).not.toBe(component.secondary as any);
  });

  it('starts with both services\' forms enabled, test mode on, and CMD empty', () => {
    expect(component.testMode).toBe(true);
    expect(component.primary.formGroup.disabled).toBe(false);
    expect(component.secondary.formGroup.disabled).toBe(false);
    expect(component.cmdDraft).toEqual({ sides: [], wheels: [] });
    expect(component.cmdSaved).toEqual({ sides: [], wheels: [] });
  });

  it('seeds both forms with their canonical defaults via the services', () => {
    expect(component.primary.formGroup.getRawValue()).toEqual(buildPrimaryCommandsDefaults());
    expect(component.secondary.formGroup.getRawValue()).toEqual(buildSecondaryCommandsDefaults());
  });

  // ---------------------------------------------------------------------------
  // First-frame form seed — the GET response populates the FORM (not just
  // the grid). Subsequent WS frames must NOT clobber the form so the user
  // doesn't lose in-flight edits. Cancel after seed restores the seeded
  // values (snapshot advances).
  // ---------------------------------------------------------------------------

  function buildResponse(overrides?: {
    primaryTff?: string;
    secondaryWhlCriticalFail?: string;
    secondaryMasterTlFail?: string;
    secondaryGdlFail?: string;
    secondaryLinkHealth?: string;
  }): SystemExperimentsResponse {
    const blank = (id: 'left' | 'right') => ({
      entityId: id,
      mCommands: [
        {
          standardFields: {
            tff: overrides?.primaryTff ?? 'not_active',
            mlmTransmit: 'no',
            videoRec: 'internal',
            videoRecType: ['no'] as string[],
            mtrRec: 'no',
            speedPwrOnOff: 'on',
            forceTtl: 'normal',
            nuu: 'no',
            muDump: 'no',
            sendMtrTss: 'no',
            abort: 'no',
          },
          additionalFields: {
            whlCriticalFail: overrides?.secondaryWhlCriticalFail ?? 'no',
            whlWarningFail: 'normal',
            whlFatalFail: 'no',
            linkHealth: overrides?.secondaryLinkHealth ?? 'normal',
          },
        },
        ...[1, 2, 3].map(() => ({
          standardFields: {
            tff: 'not_active', mlmTransmit: 'no', videoRec: 'internal',
            videoRecType: ['no'] as string[], mtrRec: 'no', speedPwrOnOff: 'on',
            forceTtl: 'normal', nuu: 'no', muDump: 'no', sendMtrTss: 'no', abort: 'no',
          },
          additionalFields: { whlCriticalFail: 'no', whlWarningFail: 'normal', whlFatalFail: 'no', linkHealth: 'normal' },
        })),
      ] as SystemExperimentsResponse['entities'][0]['mCommands'],
      aCommands: {
        tlCriticalFail: 'no',
        masterTlFail: overrides?.secondaryMasterTlFail ?? 'on',
        msTlFail: 'normal',
        tlTempFail: 'no',
        tlToAgCommFail: 'no',
        linkHealth: 'normal',
      },
      gdlFail: overrides?.secondaryGdlFail ?? 'normal',
      gdlTempFail: 'normal',
      antTransmitPwr: 'auto',
      antSelectedCmd: 'normal',
      gdlTransmitPwr: 'normal',
      uuuAntSelect: 'normal',
      linkHealth: 'normal',
    });
    return { entities: [blank('left'), blank('right')] };
  }

  it('first frame seeds the Primary form from entities[0].mCommands[0].standardFields', () => {
    frames$.next(buildResponse({ primaryTff: TFF.Dominate }));

    expect(component.primary.formGroup.getRawValue()['tff']).toBe(TFF.Dominate);
  });

  it('first frame seeds the Secondary form across all four slot families', () => {
    frames$.next(buildResponse({
      secondaryWhlCriticalFail: YES_NO.Yes,
      secondaryMasterTlFail: 'off',
      secondaryGdlFail: NORMAL_FORCED.Forced,
      secondaryLinkHealth: NORMAL_FORCED.Forced,
    }));

    const value = component.secondary.formGroup.getRawValue();
    expect(value['whlCriticalFail']).toBe(YES_NO.Yes);
    expect(value['masterTlFail']).toBe('off');
    expect(value['gdlFail']).toBe(NORMAL_FORCED.Forced);
    expect(value['linkHealth']).toBe(NORMAL_FORCED.Forced);
  });

  it('subsequent frames do NOT re-seed the form (user edits survive WS pushes)', () => {
    frames$.next(buildResponse({ primaryTff: TFF.Dominate }));
    component.primary.formGroup.patchValue({ tff: TFF.LightActive });

    frames$.next(buildResponse({ primaryTff: TFF.NotActive }));

    expect(component.primary.formGroup.getRawValue()['tff']).toBe(TFF.LightActive);
  });

  it('seed advances the snapshot — Cancel after the first frame restores the seeded value', () => {
    frames$.next(buildResponse({ primaryTff: TFF.Dominate }));

    component.primary.formGroup.patchValue({ tff: TFF.LightActive });
    component.primary.cancel();

    expect(component.primary.formGroup.getRawValue()['tff']).toBe(TFF.Dominate);
  });

  // ---------------------------------------------------------------------------
  // applyDisabled — Apply requires a complete CMD scope (side AND wheel).
  // ---------------------------------------------------------------------------

  it('applyDisabled is true when CMD is fully empty (initial state)', () => {
    expect(component.applyDisabled).toBe(true);
  });

  it('applyDisabled is true when only sides are selected (no wheels)', () => {
    component.cmdDraft = { sides: ['left'], wheels: [] };
    expect(component.applyDisabled).toBe(true);
  });

  it('applyDisabled is true when only wheels are selected (no sides)', () => {
    component.cmdDraft = { sides: [], wheels: ['1', '3'] };
    expect(component.applyDisabled).toBe(true);
  });

  it('applyDisabled is false once both a side and a wheel are selected', () => {
    component.cmdDraft = { sides: ['left'], wheels: ['3'] };
    expect(component.applyDisabled).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Footer dispatch — the shared footer routes to the active service.
  // ---------------------------------------------------------------------------

  it('onActiveApply routes to Primary while the Primary tab is active', () => {
    component.selectedTabIndex = 0;
    component.cmdDraft = { sides: ['left'], wheels: ['1'] };

    component.onActiveApply();

    expect(apiSpy.postPrimary).toHaveBeenCalledTimes(1);
    expect(apiSpy.postSecondary).not.toHaveBeenCalled();
  });

  it('onActiveApply routes to Secondary while the Secondary tab is active', () => {
    component.selectedTabIndex = 1;
    component.cmdDraft = { sides: ['left'], wheels: ['1'] };

    component.onActiveApply();

    expect(apiSpy.postSecondary).toHaveBeenCalledTimes(1);
    expect(apiSpy.postPrimary).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Defaults flow — GLOBAL action. One POST, on success BOTH boards' forms
  // are reset and CMD (draft + saved) is cleared. The active tab is irrelevant
  // — clicking Default on Primary or Secondary yields the same outcome.
  // On error nothing changes (no-op handler).
  // ---------------------------------------------------------------------------

  it('onDefaults POSTs once via postDefault (no per-board endpoints)', () => {
    component.onDefaults();

    expect(apiSpy.postDefault).toHaveBeenCalledTimes(1);
    expect(apiSpy.postPrimary).not.toHaveBeenCalled();
    expect(apiSpy.postSecondary).not.toHaveBeenCalled();
  });

  it('onDefaults resets BOTH boards\' forms on success, regardless of active tab', async () => {
    component.selectedTabIndex = 0;   // Primary tab active
    const primarySpy = spyOn(component.primary, 'defaults').and.callThrough();
    const secondarySpy = spyOn(component.secondary, 'defaults').and.callThrough();

    component.onDefaults();
    await Promise.resolve(); await Promise.resolve();

    expect(primarySpy).toHaveBeenCalledTimes(1);
    expect(secondarySpy).toHaveBeenCalledTimes(1);
  });

  it('onDefaults populates cmdDraft + cmdSaved with EVERY option on success', async () => {
    component.cmdDraft = { sides: ['left'], wheels: ['1'] };
    component.cmdSaved = { sides: ['right'], wheels: ['2'] };

    component.onDefaults();
    await Promise.resolve(); await Promise.resolve();

    expect(component.cmdDraft).toEqual({
      sides:  [...CMD_ALL_SELECTED.sides],
      wheels: [...CMD_ALL_SELECTED.wheels],
    });
    expect(component.cmdSaved).toEqual({
      sides:  [...CMD_ALL_SELECTED.sides],
      wheels: [...CMD_ALL_SELECTED.wheels],
    });
    // Each emission gets fresh array references so OnPush children rebind.
    expect(component.cmdDraft.sides).not.toBe(CMD_ALL_SELECTED.sides);
    expect(component.cmdSaved.sides).not.toBe(component.cmdDraft.sides);
  });

  it('onDefaults does NOT touch any state on error', async () => {
    const failed = new Subject<void>();
    apiSpy.postDefault.and.returnValue(failed.asObservable());
    component.cmdDraft = { sides: ['left'], wheels: ['1'] };
    component.cmdSaved = { sides: ['right'], wheels: ['2'] };
    const primarySpy = spyOn(component.primary, 'defaults').and.callThrough();
    const secondarySpy = spyOn(component.secondary, 'defaults').and.callThrough();

    component.onDefaults();
    failed.error(new Error('boom'));
    await Promise.resolve();

    expect(component.cmdDraft).toEqual({ sides: ['left'], wheels: ['1'] });
    expect(component.cmdSaved).toEqual({ sides: ['right'], wheels: ['2'] });
    expect(primarySpy).not.toHaveBeenCalled();
    expect(secondarySpy).not.toHaveBeenCalled();
  });

  it('onDefaults toggles defaultsLoading around the in-flight call', async () => {
    const inFlight = new Subject<void>();
    apiSpy.postDefault.and.returnValue(inFlight.asObservable());

    component.onDefaults();
    expect(component.defaultsLoading).toBe(true);

    inFlight.next();
    inFlight.complete();
    await Promise.resolve();

    expect(component.defaultsLoading).toBe(false);
  });

  it('onDefaults clears defaultsLoading on error too', async () => {
    const inFlight = new Subject<void>();
    apiSpy.postDefault.and.returnValue(inFlight.asObservable());

    component.onDefaults();
    expect(component.defaultsLoading).toBe(true);

    inFlight.error(new Error('boom'));
    await Promise.resolve();

    expect(component.defaultsLoading).toBe(false);
  });

  it('onDefaults ignores re-entry while a call is in flight', () => {
    const inFlight = new Subject<void>();
    apiSpy.postDefault.and.returnValue(inFlight.asObservable());

    component.onDefaults();
    component.onDefaults(); // re-entry — must be a no-op

    expect(apiSpy.postDefault).toHaveBeenCalledTimes(1);
  });

  it('onActiveCancel calls cancel() on the active service only', () => {
    component.selectedTabIndex = 1;
    const primarySpy = spyOn(component.primary, 'cancel').and.callThrough();
    const secondarySpy = spyOn(component.secondary, 'cancel').and.callThrough();

    component.onActiveCancel();

    expect(secondarySpy).toHaveBeenCalledTimes(1);
    expect(primarySpy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // cmdSaved commit + Apply loading toggle.
  // ---------------------------------------------------------------------------

  it('onActiveApply commits cmdSaved on success', async () => {
    component.cmdDraft = { sides: ['right'], wheels: ['3'] };

    component.onActiveApply();
    await Promise.resolve(); await Promise.resolve();

    expect(component.cmdSaved).toEqual({ sides: ['right'], wheels: ['3'] });
  });

  it('onActiveApply does NOT commit cmdSaved on error', async () => {
    const failed = new Subject<void>();
    apiSpy.postPrimary.and.returnValue(failed.asObservable());

    component.cmdDraft = { sides: ['left'], wheels: ['1'] };
    component.onActiveApply();
    failed.error(new Error('boom'));
    await Promise.resolve();

    expect(component.cmdSaved).toEqual({ sides: [], wheels: [] });   // unchanged
  });

  it('onActiveApply toggles applyLoading around the in-flight call', async () => {
    const inFlight = new Subject<void>();
    apiSpy.postPrimary.and.returnValue(inFlight.asObservable());
    component.cmdDraft = { sides: ['left'], wheels: ['1'] };

    component.onActiveApply();
    expect(component.applyLoading).toBe(true);

    inFlight.next(); inFlight.complete();
    await Promise.resolve();

    expect(component.applyLoading).toBe(false);
  });

  it('onActiveApply clears applyLoading on error too', async () => {
    const inFlight = new Subject<void>();
    apiSpy.postPrimary.and.returnValue(inFlight.asObservable());
    component.cmdDraft = { sides: ['left'], wheels: ['1'] };

    component.onActiveApply();
    inFlight.error(new Error('boom'));
    await Promise.resolve();

    expect(component.applyLoading).toBe(false);
  });

  it('onActiveApply ignores re-entry while a call is in flight', () => {
    const inFlight = new Subject<void>();
    apiSpy.postPrimary.and.returnValue(inFlight.asObservable());
    component.cmdDraft = { sides: ['left'], wheels: ['1'] };

    component.onActiveApply();
    component.onActiveApply();

    expect(apiSpy.postPrimary).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Tab switching.
  // ---------------------------------------------------------------------------

  it('switching tabs preserves cmdDraft and cmdSaved (CMD is shared)', () => {
    component.cmdSaved = { sides: ['left'], wheels: ['1'] };
    component.cmdDraft = { sides: ['left', 'right'], wheels: ['1', '2'] };

    component.onTabChange(1);

    expect(component.cmdSaved).toEqual({ sides: ['left'], wheels: ['1'] });
    expect(component.cmdDraft).toEqual({ sides: ['left', 'right'], wheels: ['1', '2'] });
  });

  it('switching tabs discards unapplied form edits on the LEAVING tab (calls active.cancel())', () => {
    component.selectedTabIndex = 0;
    component.primary.formGroup.patchValue({ tff: TFF.Dominate });

    component.onTabChange(1);

    expect(component.primary.formGroup.getRawValue()['tff'])
      .toBe(buildPrimaryCommandsDefaults()['tff']);
    expect(component.selectedTabIndex).toBe(1);
  });

  it('switching tabs does NOT touch the entering tab\'s form', () => {
    component.selectedTabIndex = 0;
    component.secondary.formGroup.patchValue({ whlCriticalFail: 'whatever' });
    const secondaryBefore = component.secondary.formGroup.getRawValue();

    component.onTabChange(1);

    expect(component.secondary.formGroup.getRawValue()).toEqual(secondaryBefore);
  });

  // ---------------------------------------------------------------------------
  // Test/Live mode dropdown — fans out to both services + CMD disable flag.
  // ---------------------------------------------------------------------------

  it('selecting Not Active disables both services\' forms and CMD section', () => {
    component.onTestModeChange('inactive');

    expect(component.primary.formGroup.disabled).toBe(true);
    expect(component.secondary.formGroup.disabled).toBe(true);
    expect(component.cmdDisabled).toBe(true);
    expect(component.testMode).toBe(false);
    expect(component.testModeValue).toBe('inactive');
  });

  it('selecting Active back re-enables both services\' forms and CMD section', () => {
    component.onTestModeChange('inactive');
    component.onTestModeChange('active');

    expect(component.primary.formGroup.disabled).toBe(false);
    expect(component.secondary.formGroup.disabled).toBe(false);
    expect(component.cmdDisabled).toBe(false);
    expect(component.testMode).toBe(true);
    expect(component.testModeValue).toBe('active');
  });

  it('selecting Not Active calls setEnabled(false) on both services (single call site, no leak)', () => {
    const primarySpy = spyOn(component.primary, 'setEnabled').and.callThrough();
    const secondarySpy = spyOn(component.secondary, 'setEnabled').and.callThrough();

    component.onTestModeChange('inactive');

    expect(primarySpy).toHaveBeenCalledOnceWith(false);
    expect(secondarySpy).toHaveBeenCalledOnceWith(false);
  });

  it('any value other than "active" is treated as disabled (fail-closed translation)', () => {
    component.onTestModeChange('something-unexpected');

    expect(component.testMode).toBe(false);
    expect(component.primary.formGroup.disabled).toBe(true);
    expect(component.secondary.formGroup.disabled).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test-mode POST — every state change fires postTestMode with the new
  // mode in the payload. Loading flag toggles around the call. Errors are
  // swallowed (no rollback of local state).
  // ---------------------------------------------------------------------------

  it('onTestModeChange POSTs the chosen mode (active)', () => {
    component.onTestModeChange('active');

    expect(apiSpy.postTestMode).toHaveBeenCalledTimes(1);
    expect(apiSpy.postTestMode.calls.mostRecent().args[0]).toEqual({ mode: 'active' });
  });

  it('onTestModeChange POSTs the chosen mode (inactive)', () => {
    component.onTestModeChange('inactive');

    expect(apiSpy.postTestMode).toHaveBeenCalledTimes(1);
    expect(apiSpy.postTestMode.calls.mostRecent().args[0]).toEqual({ mode: 'inactive' });
  });

  it('onTestModeChange normalises stray values to "inactive" in the wire payload', () => {
    component.onTestModeChange('something-unexpected');

    expect(apiSpy.postTestMode.calls.mostRecent().args[0]).toEqual({ mode: 'inactive' });
  });

  it('onTestModeChange toggles testModeLoading around the in-flight call', async () => {
    const inFlight = new Subject<void>();
    apiSpy.postTestMode.and.returnValue(inFlight.asObservable());

    component.onTestModeChange('inactive');
    expect(component.testModeLoading).toBe(true);

    inFlight.next(); inFlight.complete();
    await Promise.resolve();

    expect(component.testModeLoading).toBe(false);
  });

  it('onTestModeChange swallows errors and does NOT roll back local state', async () => {
    const inFlight = new Subject<void>();
    apiSpy.postTestMode.and.returnValue(inFlight.asObservable());

    component.onTestModeChange('inactive');
    inFlight.error(new Error('boom'));
    await Promise.resolve();

    // Local state stayed in the new mode; loading cleared via finalize.
    expect(component.testMode).toBe(false);
    expect(component.testModeLoading).toBe(false);
    expect(component.cmdDisabled).toBe(true);
  });
});
