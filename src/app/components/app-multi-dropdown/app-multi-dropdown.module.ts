import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { AppMultiDropdownComponent } from './app-multi-dropdown.component';

import { TestIdDirectiveModule } from '../data-test-id/test-id.module';

@NgModule({
  declarations: [AppMultiDropdownComponent],
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
    TestIdDirectiveModule,
  ],
  exports: [AppMultiDropdownComponent],
})
export class AppMultiDropdownModule {}
