import { RareDashboardState } from './rare-dashboard.models';
import { DEFAULT_CMD_SELECTION } from '../../cmd-panel/cmd-panel.models';
import { DEFAULT_RARE_OPERATIONS } from '../components/rare-operations-list/rare-operations-list.models';

export const RARE_DEFAULT_STATE: RareDashboardState = {
  isRealtime: false,
  cmd: { ...DEFAULT_CMD_SELECTION },
  rareOperations: { ...DEFAULT_RARE_OPERATIONS },
};
