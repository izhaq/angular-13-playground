import { CmdSelection } from '../../cmd-panel/cmd-panel.models';
import { FrequentOperationsModel } from '../components/frequent-operations-list/frequent-operations-list.models';
import { CmdTestModel } from '../components/cmd-test-panel/cmd-test-panel.models';

export { CmdSelection, FrequentOperationsModel, CmdTestModel };

export interface DashboardState {
  // Replaces the previous `scenario: string` enum (highway-cruise, city-traffic,
  // off-road-trail, realtime). The UI collapsed to a single Realtime toggle, so
  // the payload now carries that boolean directly.
  isRealtime: boolean;
  cmd: CmdSelection;
  operations: FrequentOperationsModel;
  cmdTest: CmdTestModel;
}

export type LeftPanelPayload = Omit<DashboardState, 'isRealtime' | 'cmd'>;
