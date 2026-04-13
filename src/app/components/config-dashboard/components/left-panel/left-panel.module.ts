import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { LeftPanelComponent } from './left-panel.component';
import { CmdPanelModule } from '../cmd-panel/cmd-panel.module';
import { FrequentOperationsListModule } from '../operations-list/operations-list.module';
import { CmdTestPanelModule } from '../cmd-test-panel/cmd-test-panel.module';

@NgModule({
  declarations: [LeftPanelComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    CmdPanelModule,
    FrequentOperationsListModule,
    CmdTestPanelModule,
  ],
  exports: [LeftPanelComponent],
})
export class LeftPanelModule {}
