import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AppDropdownModule } from '../../../app-dropdown/app-dropdown.module';
import { AppDropdownCvaModule } from '../../../app-dropdown-cva/app-dropdown-cva.module';
import { CmdFormPanelComponent } from './cmd-form-panel.component';

@NgModule({
  declarations: [CmdFormPanelComponent],
  imports: [CommonModule, ReactiveFormsModule, AppDropdownModule, AppDropdownCvaModule],
  exports: [CmdFormPanelComponent],
})
export class CmdFormPanelModule {}
