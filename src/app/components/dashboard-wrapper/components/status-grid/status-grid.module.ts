import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StatusGridComponent } from './status-grid.component';

@NgModule({
  declarations: [StatusGridComponent],
  imports: [CommonModule],
  exports: [StatusGridComponent],
})
export class StatusGridModule {}
