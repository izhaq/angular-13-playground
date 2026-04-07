import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

import { LeftPanelComponent } from './left-panel.component';
import { CmdFormPanelModule } from '../cmd-form-panel/cmd-form-panel.module';
import { OperationsFormListModule } from '../operations-form-list/operations-form-list.module';

@NgModule({
  declarations: [LeftPanelComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    CmdFormPanelModule,
    OperationsFormListModule,
  ],
  exports: [LeftPanelComponent],
})
export class LeftPanelModule {}
