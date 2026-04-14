import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FrequentCmdsTabComponent } from './frequent-cmds-tab.component';
import { LeftPanelModule } from './components/left-panel/left-panel.module';
import { StatusGridModule } from '../status-grid/status-grid.module';

@NgModule({
  declarations: [FrequentCmdsTabComponent],
  imports: [
    CommonModule,
    LeftPanelModule,
    StatusGridModule,
  ],
  exports: [FrequentCmdsTabComponent],
})
export class FrequentCmdsTabModule {}
