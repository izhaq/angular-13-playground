import { of, Subject } from 'rxjs';

import { BoardPostPayload } from '../../api/api-contract';
import { SystemExperimentsApiService } from '../../api/system-experiments-api.service';
import { CmdSelection } from '../../shared/models';
import { NORMAL_FORCED, YES_NO } from '../../shared/option-values';
import {
  SECONDARY_COMMANDS_ALL_FIELDS,
  buildSecondaryCommandsDefaults,
} from './secondary-commands.fields';
import { SecondaryCommandsBoardService } from './secondary-commands-board.service';

/**
 * Mirror of the Primary service spec. The two suites are deliberate
 * duplicates — same reason the services themselves are (see service
 * header). Identical contracts deserve identical tests; the differences
 * worth pinning are the ones the service actually has: `postSecondary`
 * (not `postPrimary`) and the secondary fields module's shape.
 */
describe('SecondaryCommandsBoardService', () => {
  let api: jasmine.SpyObj<SystemExperimentsApiService>;
  let service: SecondaryCommandsBoardService;

  const cmd: CmdSelection = { sides: ['right'], wheels: ['3'] };

  beforeEach(() => {
    api = jasmine.createSpyObj<SystemExperimentsApiService>('SystemExperimentsApiService', [
      'postPrimary',
      'postSecondary',
      'postDefault',
      'postTestMode',
    ]);
    api.postSecondary.and.returnValue(of(undefined));
    service = new SecondaryCommandsBoardService(api);
  });

  it('seeds the FormGroup with one control per declared field, at canonical defaults', () => {
    expect(service.formGroup.getRawValue()).toEqual(buildSecondaryCommandsDefaults());
    expect(Object.keys(service.formGroup.controls).length).toBe(SECONDARY_COMMANDS_ALL_FIELDS.length);
  });

  it('Cancel-before-any-Apply restores defaults (snapshot was seeded to them)', () => {
    service.formGroup.patchValue({ whlCriticalFail: YES_NO.Yes });

    service.cancel();

    expect(service.formGroup.getRawValue()).toEqual(buildSecondaryCommandsDefaults());
  });

  it('defaults() does NOT hit the network — the global POST lives at the shell', () => {
    service.defaults();

    expect(api.postPrimary).not.toHaveBeenCalled();
    expect(api.postSecondary).not.toHaveBeenCalled();
    expect(api.postDefault).not.toHaveBeenCalled();
  });

  it('defaults() resets the form to canonical values regardless of prior Apply', async () => {
    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Forced });
    await service.apply(cmd).toPromise();
    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Normal });
    service.formGroup.patchValue({ whlCriticalFail: YES_NO.Yes });

    service.defaults();

    expect(service.formGroup.getRawValue()).toEqual(buildSecondaryCommandsDefaults());
  });

  it('defaults() advances the snapshot — Cancel after Defaults restores defaults, NOT the pre-Defaults snapshot', async () => {
    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Forced });
    await service.apply(cmd).toPromise();   // snapshot = Forced

    service.defaults();

    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Normal });
    service.cancel();
    expect(service.formGroup.getRawValue()['linkHealth'])
      .toBe(buildSecondaryCommandsDefaults()['linkHealth']);
  });

  it('apply() POSTs sides + wheels + the FormGroup\'s raw value via postSecondary', () => {
    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Forced });

    service.apply(cmd).subscribe();

    expect(api.postSecondary).toHaveBeenCalledTimes(1);
    expect(api.postPrimary).not.toHaveBeenCalled();
    const payload = api.postSecondary.calls.mostRecent().args[0] as BoardPostPayload;
    expect(payload.sides).toEqual(cmd.sides);
    expect(payload.wheels).toEqual(cmd.wheels);
    expect(payload.fields['linkHealth']).toBe(NORMAL_FORCED.Forced);
    expect(Object.keys(payload.fields).sort())
      .toEqual(Object.keys(buildSecondaryCommandsDefaults()).sort());
  });

  it('apply() commits the snapshot on success — Cancel after Apply restores the applied values', async () => {
    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Forced });

    await service.apply(cmd).toPromise();
    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Normal });
    service.cancel();

    expect(service.formGroup.getRawValue()['linkHealth']).toBe(NORMAL_FORCED.Forced);
  });

  it('apply() does NOT commit the snapshot on error', async () => {
    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Forced });
    await service.apply(cmd).toPromise();   // snapshot = Forced

    const failed = new Subject<void>();
    api.postSecondary.and.returnValue(failed.asObservable());
    service.formGroup.patchValue({ linkHealth: NORMAL_FORCED.Normal });

    let errored = false;
    service.apply(cmd).subscribe({ error: () => { errored = true; } });
    failed.error(new Error('boom'));

    expect(errored).toBe(true);
    service.formGroup.patchValue({ whlCriticalFail: YES_NO.Yes });
    service.cancel();
    expect(service.formGroup.getRawValue()['linkHealth']).toBe(NORMAL_FORCED.Forced);
  });

  it('setEnabled(false) disables every control on the FormGroup', () => {
    service.setEnabled(false);

    expect(service.formGroup.disabled).toBe(true);
    for (const key of Object.keys(service.formGroup.controls)) {
      expect(service.formGroup.get(key)?.disabled).toBe(true);
    }
  });

  it('setEnabled(true) re-enables every control', () => {
    service.setEnabled(false);
    service.setEnabled(true);

    expect(service.formGroup.enabled).toBe(true);
    for (const key of Object.keys(service.formGroup.controls)) {
      expect(service.formGroup.get(key)?.enabled).toBe(true);
    }
  });

  it('setEnabled(false) does not fire valueChanges (emitEvent: false)', () => {
    let fired = false;
    service.formGroup.valueChanges.subscribe(() => { fired = true; });

    service.setEnabled(false);

    expect(fired).toBe(false);
  });
});
