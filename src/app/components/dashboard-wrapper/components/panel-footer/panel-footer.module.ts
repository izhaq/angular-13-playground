import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { PanelFooterComponent } from './panel-footer.component';

import { TestIdDirectiveModule } from '../../../../shared/directives/test-id.module';

@NgModule({
  declarations: [PanelFooterComponent],
  imports: [CommonModule, MatButtonModule, TestIdDirectiveModule],
  exports: [PanelFooterComponent],
})
export class PanelFooterModule {}
