import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppDropdownModule } from '../../../app-dropdown/app-dropdown.module';
import { CmdPanelComponent } from './cmd-panel.component';

@NgModule({
  declarations: [CmdPanelComponent],
  imports: [CommonModule, AppDropdownModule],
  exports: [CmdPanelComponent],
})
export class CmdPanelModule {}
