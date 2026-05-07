import { SystemExperimentsResponse } from './api-contract';
import { seedFromResponse } from './response-form-seeders';
import { buildPrimaryCommandsDefaults } from '../boards/primary-commands/primary-commands.fields';
import { buildSecondaryCommandsDefaults } from '../boards/secondary-commands/secondary-commands.fields';

/**
 * Spec covers the contract:
 *   - First cell wins per slot.
 *   - Bootstrap defaults fill anything the response omits.
 *   - Multi-location keys probe additionalFields → aCommands → entity flat.
 *   - Form-only primary fields stay at defaults (no backend slot).
 */
describe('seedFromResponse', () => {

  function blankResponse(): SystemExperimentsResponse {
    return {
      entities: [blankEntity('left'), blankEntity('right')],
    };
  }

  function blankEntity(id: 'left' | 'right'): SystemExperimentsResponse['entities'][0] {
    return {
      entityId: id,
      mCommands: [
        blankMCommand(), blankMCommand(), blankMCommand(), blankMCommand(),
      ] as SystemExperimentsResponse['entities'][0]['mCommands'],
      aCommands: {
        tlCriticalFail: 'no',
        masterTlFail:   'on',
        msTlFail:       'normal',
        tlTempFail:     'no',
        tlToAgCommFail: 'no',
        linkHealth:     'normal',
      },
      gdlFail:         'normal',
      gdlTempFail:     'normal',
      antTransmitPwr:  'auto',
      antSelectedCmd:  'normal',
      gdlTransmitPwr:  'normal',
      uuuAntSelect:    'normal',
      linkHealth:      'normal',
    };
  }

  function blankMCommand() {
    return {
      standardFields: {
        tff: 'not_active',
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
        whlCriticalFail: 'no',
        whlWarningFail:  'normal',
        whlFatalFail:    'no',
        linkHealth:      'normal',
      },
    };
  }

  it('seeds primary from entities[0].mCommands[0].standardFields (first cell wins)', () => {
    const response = blankResponse();
    response.entities[0].mCommands[0].standardFields.tff = 'dominate';
    // Other cells deliberately differ — they MUST be ignored.
    response.entities[0].mCommands[1].standardFields.tff = 'light_active';
    response.entities[1].mCommands[0].standardFields.tff = 'not_active';

    const { primary } = seedFromResponse(response);

    expect(primary['tff']).toBe('dominate');
  });

  it('preserves multi-select shape (videoRecType arrives as array)', () => {
    const response = blankResponse();
    response.entities[0].mCommands[0].standardFields.videoRecType = ['ir', '4k'];

    const { primary } = seedFromResponse(response);

    expect(primary['videoRecType']).toEqual(['ir', '4k']);
  });

  it('keeps form-only primary fields at bootstrap defaults (no backend slot)', () => {
    const defaults = buildPrimaryCommandsDefaults();
    const { primary } = seedFromResponse(blankResponse());

    expect(primary['teo']).toBe(defaults['teo']);
    expect(primary['gsMtrRec']).toBe(defaults['gsMtrRec']);
    expect(primary['aiMtrRec']).toBe(defaults['aiMtrRec']);
  });

  it('seeds secondary 8-col fields from entities[0].mCommands[0].additionalFields', () => {
    const response = blankResponse();
    response.entities[0].mCommands[0].additionalFields.whlCriticalFail = 'yes';
    response.entities[0].mCommands[1].additionalFields.whlCriticalFail = 'no'; // must be ignored

    const { secondary } = seedFromResponse(response);

    expect(secondary['whlCriticalFail']).toBe('yes');
  });

  it('seeds TLL/TLR fields from entities[0].aCommands (left side)', () => {
    const response = blankResponse();
    response.entities[0].aCommands.masterTlFail = 'off';
    response.entities[1].aCommands.masterTlFail = 'on'; // right is ignored

    const { secondary } = seedFromResponse(response);

    expect(secondary['masterTlFail']).toBe('off');
  });

  it('seeds GDL fields from entities[0] flat props', () => {
    const response = blankResponse();
    response.entities[0].gdlFail = 'forced';
    response.entities[0].antTransmitPwr = 'manual';

    const { secondary } = seedFromResponse(response);

    expect(secondary['gdlFail']).toBe('forced');
    expect(secondary['antTransmitPwr']).toBe('manual');
  });

  it('multi-location: prefers additionalFields when populated', () => {
    const response = blankResponse();
    response.entities[0].mCommands[0].additionalFields.linkHealth = 'forced';
    response.entities[0].aCommands.linkHealth = 'normal';
    response.entities[0].linkHealth = 'normal';

    const { secondary } = seedFromResponse(response);

    expect(secondary['linkHealth']).toBe('forced');
  });

  it('multi-location: falls back to aCommands when additionalFields lacks the key', () => {
    const response = blankResponse();
    deleteKey(response.entities[0].mCommands[0].additionalFields, 'linkHealth');
    response.entities[0].aCommands.linkHealth = 'forced';
    response.entities[0].linkHealth = 'normal';

    const { secondary } = seedFromResponse(response);

    expect(secondary['linkHealth']).toBe('forced');
  });

  it('multi-location: falls back to entity flat when neither slot has the key', () => {
    const response = blankResponse();
    deleteKey(response.entities[0].mCommands[0].additionalFields, 'linkHealth');
    deleteKey(response.entities[0].aCommands, 'linkHealth');
    response.entities[0].linkHealth = 'forced';

    const { secondary } = seedFromResponse(response);

    expect(secondary['linkHealth']).toBe('forced');
  });

  it('falls back to bootstrap defaults when the response omits a key entirely', () => {
    const response = blankResponse();
    deleteKey(response.entities[0].mCommands[0].standardFields, 'tff');
    const defaults = buildPrimaryCommandsDefaults();

    const { primary } = seedFromResponse(response);

    expect(primary['tff']).toBe(defaults['tff']);
  });

  /**
   * The wire types declare these keys as required, but the seeder is
   * intentionally defensive against runtime omissions. This helper keeps
   * the tests honest about that contract — TypeScript-required at design
   * time, behaviorally optional at runtime.
   */
  function deleteKey(target: object, key: string): void {
    delete (target as unknown as Record<string, unknown>)[key];
  }

  it('returns the same shape as buildSecondaryCommandsDefaults() (full key coverage)', () => {
    const expectedKeys = Object.keys(buildSecondaryCommandsDefaults()).sort();
    const { secondary } = seedFromResponse(blankResponse());

    expect(Object.keys(secondary).sort()).toEqual(expectedKeys);
  });

});
