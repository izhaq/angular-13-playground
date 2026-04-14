import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LeftPanelComponent } from './left-panel.component';
import { CmdPanelModule } from '../../../cmd-panel/cmd-panel.module';
import { FrequentOperationsListModule } from '../operations-list/operations-list.module';
import { CmdTestPanelModule } from '../cmd-test-panel/cmd-test-panel.module';
import { PanelFooterModule } from '../../../panel-footer/panel-footer.module';

@NgModule({
  declarations: [LeftPanelComponent],
  imports: [
    CommonModule,
    CmdPanelModule,
    FrequentOperationsListModule,
    CmdTestPanelModule,
    PanelFooterModule,
  ],
  exports: [LeftPanelComponent],
})
export class LeftPanelModule {}
