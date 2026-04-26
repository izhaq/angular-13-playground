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
import { TFF } from '../shared/option-values';

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
    primaryPostUrl: '/api/test/primary',
    secondaryPostUrl: '/api/test/secondary',
    getUrl: '/api/test/get',
    wsUrl: 'ws://test/ws',
  };

  let fixture: ComponentFixture<SystemExperimentsShellComponent>;
  let component: SystemExperimentsShellComponent;
  let apiSpy: jasmine.SpyObj<SystemExperimentsApiService>;
  let frames$: Subject<SystemExperimentsResponse>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<SystemExperimentsApiService>('SystemExperimentsApiService', [
      'postPrimary',
      'postSecondary',
    ]);
    apiSpy.postPrimary.and.callFake(() => {
      const s = new Subject<void>();
      queueMicrotask(() => { s.next(); s.complete(); });
      return s.asObservable();
    });
    apiSpy.postSecondary.and.callFake(() => {
      const s = new Subject<void>();
      queueMicrotask(() => { s.next(); s.complete(); });
      return s.asObservable();
    });

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
    // Assertion is at the shell boundary so a regression in either the
    // service's seeding OR the shell's wiring would surface here.
    expect(component.primary.formGroup.getRawValue()).toEqual(buildPrimaryCommandsDefaults());
    expect(component.secondary.formGroup.getRawValue()).toEqual(buildSecondaryCommandsDefaults());
  });

  // ---------------------------------------------------------------------------
  // applyDisabled — Apply requires a complete CMD scope (side AND wheel).
  // The server fans the POST out by (side, wheel) for additionalFields and
  // by side for aCommands; an empty selection no-ops on the wire, so the
  // button is gated client-side rather than letting users fire dud requests.
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
  // The shell knows which service is active via `selectedTabIndex`;
  // each handler is one line. We assert the routing decision (which
  // service method got called) rather than the resulting state
  // (that's the service spec's job).
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

  it('onActiveDefaults calls defaults() on the active service only', () => {
    component.selectedTabIndex = 0;
    const primarySpy = spyOn(component.primary, 'defaults').and.callThrough();
    const secondarySpy = spyOn(component.secondary, 'defaults').and.callThrough();

    component.onActiveDefaults();

    expect(primarySpy).toHaveBeenCalledTimes(1);
    expect(secondarySpy).not.toHaveBeenCalled();
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
  // cmdSaved commit — the ONE piece of cross-board state the shell
  // commits in response to Apply. Snapshot commit lives inside the
  // service and is tested there; the shell only commits cmdSaved.
  // ---------------------------------------------------------------------------

  it('onActiveApply commits cmdSaved on success', async () => {
    component.cmdDraft = { sides: ['right'], wheels: ['3'] };

    component.onActiveApply();
    await Promise.resolve(); await Promise.resolve();

    expect(component.cmdSaved).toEqual({ sides: ['right'], wheels: ['3'] });
  });

  it('onActiveApply does NOT commit cmdSaved on error', async () => {
    apiSpy.postPrimary.and.returnValue(new Subject<void>().asObservable());
    const failed = new Subject<void>();
    apiSpy.postPrimary.and.returnValue(failed.asObservable());

    component.cmdDraft = { sides: ['left'], wheels: ['1'] };
    component.onActiveApply();
    failed.error(new Error('boom'));
    await Promise.resolve();

    expect(component.cmdSaved).toEqual({ sides: [], wheels: [] });   // unchanged from initial
  });

  // ---------------------------------------------------------------------------
  // Tab switching — leaving tab is reset to its snapshot via the
  // active controller's cancel(); shared CMD state is untouched.
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

    // Leaving tab (Primary) is reset to its snapshot — initially defaults.
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
  // Test/Live mode — fans out to both services + CMD disable flag.
  //
  // Handler now takes a dropdown option value string ('active' / 'inactive')
  // instead of a boolean. Behaviour invariants (which downstream calls
  // happen, what state is reached) are unchanged — only the input shape
  // moved. Anything other than the explicit 'active' sentinel is treated
  // as disabled (fail-closed); we cover that with a stray-value case.
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
    // Defensive: the handler does `value === 'active'` so an unexpected
    // wire value can't accidentally enable. This pins that decision
    // against future refactors that might switch to a `!== 'inactive'`
    // shape (which would silently flip the default).
    component.onTestModeChange('something-unexpected');

    expect(component.testMode).toBe(false);
    expect(component.primary.formGroup.disabled).toBe(true);
    expect(component.secondary.formGroup.disabled).toBe(true);
  });
});
