import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';

import { TopBarModule } from '../top-bar/top-bar.module';
import { ConfigDashboardModule } from '../../config-dashboard.module';
import { DashboardWrapperComponent } from './dashboard-wrapper.component';

@NgModule({
  declarations: [DashboardWrapperComponent],
  imports: [
    CommonModule,
    MatTabsModule,
    TopBarModule,
    ConfigDashboardModule,
  ],
  exports: [DashboardWrapperComponent],
})
export class DashboardWrapperModule {}
