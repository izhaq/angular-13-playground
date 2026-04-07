import { CommandPair } from '../components/cmd-form-panel/cmd-form-panel.models';
import { OperationsValue } from '../components/operations-form-list/operations-form-list.models';

export { CommandPair, OperationsValue };

export interface DashboardFormValue {
  action: string;
  commands: CommandPair;
  operations: OperationsValue;
}

export interface LeftPanelFormPayload {
  commands: CommandPair;
  operations: OperationsValue;
}
