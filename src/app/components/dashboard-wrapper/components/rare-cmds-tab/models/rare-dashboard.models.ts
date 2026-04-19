import { CmdSelection } from '../../cmd-panel/cmd-panel.models';
import { RareOperationsModel } from '../components/rare-operations-list/rare-operations-list.models';

export { CmdSelection, RareOperationsModel };

export interface RareDashboardState {
  // See dashboard.models.ts (frequent tab) for the rationale: scenario was a
  // 4-value enum, the UI collapsed to a single Realtime toggle, and the
  // payload now carries the boolean directly.
  isRealtime: boolean;
  cmd: CmdSelection;
  rareOperations: RareOperationsModel;
}

export type RareLeftPanelPayload = Omit<RareDashboardState, 'isRealtime' | 'cmd'>;
