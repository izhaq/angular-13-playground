import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppMultiDropdownModule } from '../../../app-multi-dropdown/app-multi-dropdown.module';
import { CmdPanelComponent } from './cmd-panel.component';

@NgModule({
  declarations: [CmdPanelComponent],
  imports: [CommonModule, AppMultiDropdownModule],
  exports: [CmdPanelComponent],
})
export class CmdPanelModule {}
