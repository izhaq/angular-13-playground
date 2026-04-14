import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppDropdownModule } from '../../../../../app-dropdown/app-dropdown.module';
import { RareOperationsListComponent } from './rare-operations-list.component';

@NgModule({
  declarations: [RareOperationsListComponent],
  imports: [CommonModule, AppDropdownModule],
  exports: [RareOperationsListComponent],
})
export class RareOperationsListModule {}
