import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AppDropdownModule } from '../../../app-dropdown/app-dropdown.module';
import { AppDropdownCvaModule } from '../../../app-dropdown-cva/app-dropdown-cva.module';
import { OperationsFormListComponent } from './operations-form-list.component';

@NgModule({
  declarations: [OperationsFormListComponent],
  imports: [CommonModule, ReactiveFormsModule, AppDropdownModule, AppDropdownCvaModule],
  exports: [OperationsFormListComponent],
})
export class OperationsFormListModule {}
