import { DashboardState } from './dashboard.models';
import { DEFAULT_CMD_SELECTION } from '../components/cmd-panel/cmd-panel.models';
import { DEFAULT_OPERATIONS } from '../components/operations-list/operations-list.models';

export const DEFAULT_STATE: DashboardState = {
  scenario: 'highway-cruise',
  cmd: { ...DEFAULT_CMD_SELECTION },
  operations: { ...DEFAULT_OPERATIONS },
};
