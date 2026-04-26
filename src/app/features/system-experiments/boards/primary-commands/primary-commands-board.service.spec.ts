import { of, Subject } from 'rxjs';

import { BoardPostPayload } from '../../api/api-contract';
import { SystemExperimentsApiService } from '../../api/system-experiments-api.service';
import { CmdSelection } from '../../shared/models';
import { TFF, YES_NO } from '../../shared/option-values';
import {
  PRIMARY_COMMANDS_ALL_FIELDS,
  buildPrimaryCommandsDefaults,
} from './primary-commands.fields';
import { PrimaryCommandsBoardService } from './primary-commands-board.service';

/**
 * Pure unit specs — no TestBed, no fixture, no Angular wiring. The
 * service is a plain `@Injectable()` whose only collaborator is the
 * API service; we hand-stub it. This is the right scope: the
 * service IS the per-board logic, and proving it correct in
 * isolation lets the shell's spec focus on dispatch + cross-board
 * behaviour.
 */
describe('PrimaryCommandsBoardService', () => {
  let api: jasmine.SpyObj<SystemExperimentsApiService>;
  let service: PrimaryCommandsBoardService;

  const cmd: CmdSelection = { sides: ['left'], wheels: ['1'] };

  beforeEach(() => {
    api = jasmine.createSpyObj<SystemExperimentsApiService>('SystemExperimentsApiService', [
      'postPrimary',
      'postSecondary',
    ]);
    api.postPrimary.and.returnValue(of(undefined));
    service = new PrimaryCommandsBoardService(api);
  });

  // ---------------------------------------------------------------------------
  // Construction — the FormGroup is materialised eagerly via the shared
  // `buildFormGroup` primitive against the sibling fields module's
  // `_ALL_FIELDS` array. Snapshot mirrors that initial state so
  // Cancel-before-first-Apply has somewhere to restore to without a
  // nullable branch.
  // ---------------------------------------------------------------------------

  it('seeds the FormGroup with one control per declared field, at canonical defaults', () => {
    expect(service.formGroup.getRawValue()).toEqual(buildPrimaryCommandsDefaults());
    expect(Object.keys(service.formGroup.controls).length).toBe(PRIMARY_COMMANDS_ALL_FIELDS.length);
  });

  it('Cancel-before-any-Apply restores defaults (snapshot was seeded to them)', () => {
    service.formGroup.patchValue({ tff: TFF.Dominate });

    service.cancel();

    expect(service.formGroup.getRawValue()).toEqual(buildPrimaryCommandsDefaults());
  });

  // ---------------------------------------------------------------------------
  // defaults() — independent of snapshot, always restores canonical values.
  // ---------------------------------------------------------------------------

  it('defaults() resets the form to canonical values regardless of prior Apply', async () => {
    service.formGroup.patchValue({ tff: TFF.LightActive });
    await service.apply(cmd).toPromise();   // snapshot now has LightActive
    service.formGroup.patchValue({ tff: TFF.Dominate });

    service.defaults();

    expect(service.formGroup.getRawValue()).toEqual(buildPrimaryCommandsDefaults());
  });

  // ---------------------------------------------------------------------------
  // apply() — payload composition + snapshot commit semantics.
  // ---------------------------------------------------------------------------

  it('apply() POSTs sides + wheels + the FormGroup\'s raw value', () => {
    service.formGroup.patchValue({ tff: TFF.Dominate, mlmTransmit: YES_NO.Yes });

    service.apply(cmd).subscribe();

    expect(api.postPrimary).toHaveBeenCalledTimes(1);
    const payload = api.postPrimary.calls.mostRecent().args[0] as BoardPostPayload;
    expect(payload.sides).toEqual(cmd.sides);
    expect(payload.wheels).toEqual(cmd.wheels);
    expect(payload.fields['tff']).toBe(TFF.Dominate);
    expect(payload.fields['mlmTransmit']).toBe(YES_NO.Yes);
    // Every form field travels — even the unchanged defaults — so the
    // server gets a complete snapshot, not a delta. Asserting the keyset
    // equals the form's declared shape pins this contract.
    expect(Object.keys(payload.fields).sort())
      .toEqual(Object.keys(buildPrimaryCommandsDefaults()).sort());
  });

  it('apply() does NOT route through postSecondary', () => {
    service.apply(cmd).subscribe();
    expect(api.postSecondary).not.toHaveBeenCalled();
  });

  it('apply() commits the snapshot on success — Cancel after Apply restores the applied values', async () => {
    service.formGroup.patchValue({ tff: TFF.Dominate });

    await service.apply(cmd).toPromise();
    service.formGroup.patchValue({ tff: TFF.LightActive });
    service.cancel();

    expect(service.formGroup.getRawValue()['tff']).toBe(TFF.Dominate);
  });

  it('apply() does NOT commit the snapshot on error — Cancel still restores the previous snapshot', async () => {
    // First Apply succeeds: snapshot = Dominate.
    service.formGroup.patchValue({ tff: TFF.Dominate });
    await service.apply(cmd).toPromise();

    // Second Apply fails: snapshot must remain Dominate, not advance to LightActive.
    const failed = new Subject<void>();
    api.postPrimary.and.returnValue(failed.asObservable());
    service.formGroup.patchValue({ tff: TFF.LightActive });

    let errored = false;
    service.apply(cmd).subscribe({ error: () => { errored = true; } });
    failed.error(new Error('boom'));

    expect(errored).toBe(true);
    service.formGroup.patchValue({ tff: TFF.NotActive });
    service.cancel();
    expect(service.formGroup.getRawValue()['tff']).toBe(TFF.Dominate);
  });

  // ---------------------------------------------------------------------------
  // setEnabled() — drives the FormGroup with emitEvent: false to avoid
  // a phantom valueChanges emission on test/live-mode flips.
  // ---------------------------------------------------------------------------

  it('setEnabled(false) disables every control on the FormGroup', () => {
    service.setEnabled(false);

    expect(service.formGroup.disabled).toBe(true);
    for (const key of Object.keys(service.formGroup.controls)) {
      expect(service.formGroup.get(key)?.disabled)
        .withContext(`"${key}" should follow the group state`)
        .toBe(true);
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
