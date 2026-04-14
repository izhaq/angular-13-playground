import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RareCmdsTabComponent } from './rare-cmds-tab.component';
import { RareLeftPanelModule } from './components/rare-left-panel/rare-left-panel.module';
import { StatusGridModule } from '../status-grid/status-grid.module';

@NgModule({
  declarations: [RareCmdsTabComponent],
  imports: [
    CommonModule,
    RareLeftPanelModule,
    StatusGridModule,
  ],
  exports: [RareCmdsTabComponent],
})
export class RareCmdsTabModule {}
