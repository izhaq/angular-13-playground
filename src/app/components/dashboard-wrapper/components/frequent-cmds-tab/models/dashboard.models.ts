import { CmdSelection } from '../../cmd-panel/cmd-panel.models';
import { FrequentOperationsModel } from '../components/frequent-operations-list/frequent-operations-list.models';
import { CmdTestModel } from '../components/cmd-test-panel/cmd-test-panel.models';

export { CmdSelection, FrequentOperationsModel, CmdTestModel };

export interface DashboardState {
  scenario: string;
  cmd: CmdSelection;
  operations: FrequentOperationsModel;
  cmdTest: CmdTestModel;
}

export type LeftPanelPayload = Omit<DashboardState, 'scenario' | 'cmd'>;
