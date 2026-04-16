import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RareCmdsTabComponent } from './rare-cmds-tab.component';
import { CmdPanelModule } from '../cmd-panel/cmd-panel.module';
import { RareLeftPanelModule } from './components/rare-left-panel/rare-left-panel.module';
import { StatusGridModule } from '../status-grid/status-grid.module';

@NgModule({
  declarations: [RareCmdsTabComponent],
  imports: [
    CommonModule,
    CmdPanelModule,
    RareLeftPanelModule,
    StatusGridModule,
  ],
  exports: [RareCmdsTabComponent],
})
export class RareCmdsTabModule {}
