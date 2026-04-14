import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppDropdownModule } from '../../../../../app-dropdown/app-dropdown.module';
import { CmdTestPanelComponent } from './cmd-test-panel.component';

@NgModule({
  declarations: [CmdTestPanelComponent],
  imports: [CommonModule, AppDropdownModule],
  exports: [CmdTestPanelComponent],
})
export class CmdTestPanelModule {}
