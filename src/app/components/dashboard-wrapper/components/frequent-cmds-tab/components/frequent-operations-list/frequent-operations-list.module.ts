import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppDropdownModule } from '../../../../../app-dropdown/app-dropdown.module';
import { AppMultiDropdownModule } from '../../../../../app-multi-dropdown/app-multi-dropdown.module';
import { FrequentOperationsListComponent } from './frequent-operations-list.component';

@NgModule({
  declarations: [FrequentOperationsListComponent],
  imports: [CommonModule, AppDropdownModule, AppMultiDropdownModule],
  exports: [FrequentOperationsListComponent],
})
export class FrequentOperationsListModule {}
