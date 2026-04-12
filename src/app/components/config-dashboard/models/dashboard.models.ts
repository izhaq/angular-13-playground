import { CmdSelection } from '../components/cmd-panel/cmd-panel.models';
import { OperationsValue } from '../components/operations-list/operations-list.models';

export { CmdSelection, OperationsValue };

export interface DashboardState {
  scenario: string;
  cmd: CmdSelection;
  operations: OperationsValue;
}

export interface LeftPanelPayload {
  cmd: CmdSelection;
  operations: OperationsValue;
}
