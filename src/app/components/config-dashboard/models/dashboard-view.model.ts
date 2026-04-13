import { DashboardState } from './dashboard.models';

export interface DashboardViewModel {
  state: DashboardState;
  isRealtime: boolean;
}
