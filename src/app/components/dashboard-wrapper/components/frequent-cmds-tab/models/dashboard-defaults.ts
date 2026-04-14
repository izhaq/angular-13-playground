import { DashboardState } from './dashboard.models';
import { DEFAULT_CMD_SELECTION } from '../../cmd-panel/cmd-panel.models';
import { DEFAULT_OPERATIONS } from '../components/frequent-operations-list/frequent-operations-list.models';
import { DEFAULT_CMD_TEST } from '../components/cmd-test-panel/cmd-test-panel.models';

export const DEFAULT_STATE: DashboardState = {
  scenario: 'highway-cruise',
  cmd: { ...DEFAULT_CMD_SELECTION },
  operations: { ...DEFAULT_OPERATIONS },
  cmdTest: { ...DEFAULT_CMD_TEST },
};
