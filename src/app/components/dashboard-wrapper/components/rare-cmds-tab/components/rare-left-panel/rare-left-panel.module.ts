import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RareLeftPanelComponent } from './rare-left-panel.component';
import { RareOperationsListModule } from '../rare-operations-list/rare-operations-list.module';
import { PanelFooterModule } from '../../../panel-footer/panel-footer.module';

@NgModule({
  declarations: [RareLeftPanelComponent],
  imports: [
    CommonModule,
    RareOperationsListModule,
    PanelFooterModule,
  ],
  exports: [RareLeftPanelComponent],
})
export class RareLeftPanelModule {}
