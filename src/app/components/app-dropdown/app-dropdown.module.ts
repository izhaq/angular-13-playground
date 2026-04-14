import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { AppDropdownComponent } from './app-dropdown.component';
import { TestIdDirectiveModule } from '../../shared/directives/test-id.module';

@NgModule({
  declarations: [AppDropdownComponent],
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
    TestIdDirectiveModule
  ],
  exports: [AppDropdownComponent],
})
export class AppDropdownModule {}
