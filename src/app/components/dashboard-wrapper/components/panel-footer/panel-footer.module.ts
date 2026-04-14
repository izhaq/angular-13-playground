import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { PanelFooterComponent } from './panel-footer.component';

@NgModule({
  declarations: [PanelFooterComponent],
  imports: [CommonModule, MatButtonModule],
  exports: [PanelFooterComponent],
})
export class PanelFooterModule {}
