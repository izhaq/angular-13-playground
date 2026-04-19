import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';

import { TopBarModule } from './components/top-bar/top-bar.module';
import { CmdPanelModule } from './components/cmd-panel/cmd-panel.module';
import { FrequentCmdsTabModule } from './components/frequent-cmds-tab/frequent-cmds-tab.module';
import { RareCmdsTabModule } from './components/rare-cmds-tab/rare-cmds-tab.module';
import { DashboardWrapperComponent } from './dashboard-wrapper.component';
import { TestIdDirectiveModule } from '../../shared/directives/test-id.module';

@NgModule({
  declarations: [DashboardWrapperComponent],
  imports: [
    CommonModule,
    MatTabsModule,
    TopBarModule,
    CmdPanelModule,
    FrequentCmdsTabModule,
    RareCmdsTabModule,
    TestIdDirectiveModule,
  ],
  exports: [DashboardWrapperComponent],
})
export class DashboardWrapperModule {}
