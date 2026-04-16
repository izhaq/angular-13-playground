import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LeftPanelComponent } from './left-panel.component';
import { FrequentOperationsListModule } from '../frequent-operations-list/frequent-operations-list.module';
import { CmdTestPanelModule } from '../cmd-test-panel/cmd-test-panel.module';
import { PanelFooterModule } from '../../../panel-footer/panel-footer.module';

@NgModule({
  declarations: [LeftPanelComponent],
  imports: [
    CommonModule,
    FrequentOperationsListModule,
    CmdTestPanelModule,
    PanelFooterModule,
  ],
  exports: [LeftPanelComponent],
})
export class LeftPanelModule {}
