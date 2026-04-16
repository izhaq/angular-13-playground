import { CmdSelection } from '../../cmd-panel/cmd-panel.models';
import { RareOperationsModel } from '../components/rare-operations-list/rare-operations-list.models';

export { CmdSelection, RareOperationsModel };

export interface RareDashboardState {
  scenario: string;
  cmd: CmdSelection;
  rareOperations: RareOperationsModel;
}

export type RareLeftPanelPayload = Omit<RareDashboardState, 'scenario' | 'cmd'>;
