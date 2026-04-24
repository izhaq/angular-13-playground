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
import {
  PRIMARY_COMMANDS_ALL_FIELDS,
  buildPrimaryCommandsDefaults,
} from '../boards/primary-commands/primary-commands.fields';
import {
  SECONDARY_COMMANDS_ALL_FIELDS,
  buildSecondaryCommandsDefaults,
} from '../boards/secondary-commands/secondary-commands.fields';
import { BoardPostPayload } from '../api/api-contract';
import { TFF, YES_NO } from '../shared/option-values';

/**
 * Shell behavior is the contract between every dumb child and the user.
 * Tests assert observable outcomes — what the API gets called with, what
 * the form holds after each button click, what disable/tab transitions
 * produce — never internal mechanics. Stable when refactored.
 *
 * `SystemExperimentsDataService` is stubbed with a manual subject so the spec
 * controls when grid frames arrive without spinning up real timers/WS.
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
  // Initial state
  // ---------------------------------------------------------------------------

  it('starts with both forms enabled, test mode on, and CMD empty', () => {
    expect(component.testMode).toBe(true);
    expect(component.primaryFormGroup.disabled).toBe(false);
    expect(component.secondaryFormGroup.disabled).toBe(false);
    expect(component.cmdDraft).toEqual({ sides: [], wheels: [] });
    expect(component.cmdSaved).toEqual({ sides: [], wheels: [] });
  });

  it('seeds both form groups with their canonical defaults', () => {
    expect(component.primaryFormGroup.getRawValue()).toEqual(buildPrimaryCommandsDefaults());
    expect(component.secondaryFormGroup.getRawValue()).toEqual(buildSecondaryCommandsDefaults());
  });

  // ---------------------------------------------------------------------------
  // Apply
  // ---------------------------------------------------------------------------

  it('Apply on Primary calls postPrimary with cmd draft + full form snapshot', () => {
    component.cmdDraft = { sides: ['left'], wheels: ['1', '2'] };
    component.primaryFormGroup.patchValue({ tff: TFF.Dominate });

    component.onPrimaryApply();

    expect(apiSpy.postPrimary).toHaveBeenCalledTimes(1);
    const payload = apiSpy.postPrimary.calls.mostRecent().args[0] as BoardPostPayload;
    expect(payload.sides).toEqual(['left']);
    expect(payload.wheels).toEqual(['1', '2']);
    // Edited field is set; every other default still ships in the payload.
    expect(payload.fields['tff']).toBe(TFF.Dominate);
    expect(Object.keys(payload.fields).sort()).toEqual(
      PRIMARY_COMMANDS_ALL_FIELDS.map((f) => f.key).sort(),
    );
  });

  it('Apply on Secondary calls postSecondary, not postPrimary', () => {
    component.onSecondaryApply();
    expect(apiSpy.postSecondary).toHaveBeenCalledTimes(1);
    expect(apiSpy.postPrimary).not.toHaveBeenCalled();
  });

  it('Apply commits the form snapshot and the CMD draft on success', async () => {
    component.cmdDraft = { sides: ['right'], wheels: ['3'] };
    component.primaryFormGroup.patchValue({ mlmTransmit: YES_NO.Yes });

    component.onPrimaryApply();
    await Promise.resolve(); await Promise.resolve();

    expect(component.cmdSaved).toEqual({ sides: ['right'], wheels: ['3'] });

    // Editing again, then Cancel → reverts to the just-applied snapshot, not original defaults.
    component.primaryFormGroup.patchValue({ mlmTransmit: YES_NO.No });
    component.onPrimaryCancel();
    expect(component.primaryFormGroup.getRawValue()['mlmTransmit']).toBe(YES_NO.Yes);
  });

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  it('Cancel restores the form to its last-applied snapshot', () => {
    component.primaryFormGroup.patchValue({ tff: TFF.LightActive, abort: YES_NO.Yes });
    component.onPrimaryCancel();

    const value = component.primaryFormGroup.getRawValue();
    const defaults = buildPrimaryCommandsDefaults();
    expect(value['tff']).toBe(defaults['tff']);
    expect(value['abort']).toBe(defaults['abort']);
  });

  // ---------------------------------------------------------------------------
  // Defaults
  // ---------------------------------------------------------------------------

  it('Defaults resets the form to the canonical defaults regardless of snapshot', async () => {
    component.primaryFormGroup.patchValue({ tff: TFF.LightActive });
    component.onPrimaryApply();
    await Promise.resolve(); await Promise.resolve();
    component.primaryFormGroup.patchValue({ tff: TFF.Dominate });

    component.onPrimaryDefaults();

    expect(component.primaryFormGroup.getRawValue()).toEqual(buildPrimaryCommandsDefaults());
  });

  // ---------------------------------------------------------------------------
  // Tab switching
  // ---------------------------------------------------------------------------

  it('switching tabs preserves cmdDraft and cmdSaved (CMD is shared)', () => {
    component.cmdSaved = { sides: ['left'], wheels: ['1'] };
    component.cmdDraft = { sides: ['left', 'right'], wheels: ['1', '2'] };

    component.onTabChange(1);

    expect(component.cmdSaved).toEqual({ sides: ['left'], wheels: ['1'] });
    expect(component.cmdDraft).toEqual({ sides: ['left', 'right'], wheels: ['1', '2'] });
  });

  it('switching tabs discards unapplied form edits on the leaving tab', () => {
    component.primaryFormGroup.patchValue({ tff: TFF.Dominate });
    component.onTabChange(1);
    expect(component.primaryFormGroup.getRawValue()['tff']).toBe(buildPrimaryCommandsDefaults()['tff']);
  });

  // ---------------------------------------------------------------------------
  // Test/Live mode
  // ---------------------------------------------------------------------------

  it('toggling test mode off disables both form groups and CMD section', () => {
    component.onTestModeChange(false);

    expect(component.primaryFormGroup.disabled).toBe(true);
    expect(component.secondaryFormGroup.disabled).toBe(true);
    expect(component.cmdDisabled).toBe(true);
  });

  it('toggling test mode back on re-enables both form groups and CMD section', () => {
    component.onTestModeChange(false);
    component.onTestModeChange(true);

    expect(component.primaryFormGroup.disabled).toBe(false);
    expect(component.secondaryFormGroup.disabled).toBe(false);
    expect(component.cmdDisabled).toBe(false);
  });
});
