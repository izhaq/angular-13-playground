import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FrequentCmdsTabComponent } from './frequent-cmds-tab.component';
import { CmdPanelModule } from '../cmd-panel/cmd-panel.module';
import { LeftPanelModule } from './components/left-panel/left-panel.module';
import { StatusGridModule } from '../status-grid/status-grid.module';

@NgModule({
  declarations: [FrequentCmdsTabComponent],
  imports: [
    CommonModule,
    CmdPanelModule,
    LeftPanelModule,
    StatusGridModule,
  ],
  exports: [FrequentCmdsTabComponent],
})
export class FrequentCmdsTabModule {}
