import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppDropdownModule } from '../../../app-dropdown/app-dropdown.module';
import { AppMultiDropdownModule } from '../../../app-multi-dropdown/app-multi-dropdown.module';
import { OperationsListComponent } from './operations-list.component';

@NgModule({
  declarations: [OperationsListComponent],
  imports: [CommonModule, AppDropdownModule, AppMultiDropdownModule],
  exports: [OperationsListComponent],
})
export class OperationsListModule {}
