import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StatusGridComponent } from './status-grid.component';
import { TestIdDirectiveModule } from '../../../../shared/directives/test-id.module';

@NgModule({
  declarations: [StatusGridComponent],
  imports: [CommonModule, TestIdDirectiveModule],
  exports: [StatusGridComponent],
})
export class StatusGridModule {}
