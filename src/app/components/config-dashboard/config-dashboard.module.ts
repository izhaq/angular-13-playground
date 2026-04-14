import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfigDashboardComponent } from './config-dashboard.component';
import { LeftPanelModule } from './components/left-panel/left-panel.module';
import { StatusGridModule } from './components/status-grid/status-grid.module';

@NgModule({
  declarations: [ConfigDashboardComponent],
  imports: [
    CommonModule,
    LeftPanelModule,
    StatusGridModule,
  ],
  exports: [ConfigDashboardComponent],
})
export class ConfigDashboardModule {}
