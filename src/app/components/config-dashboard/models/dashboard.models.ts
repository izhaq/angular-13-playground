import { CmdSelection } from '../components/cmd-panel/cmd-panel.models';
import { FrequentOperationsModel } from '../components/operations-list/operations-list.models';

export { CmdSelection, FrequentOperationsModel };

export interface DashboardState {
  scenario: string;
  cmd: CmdSelection;
  operations: FrequentOperationsModel;
}

export type LeftPanelPayload = Omit<DashboardState, 'scenario'>;
