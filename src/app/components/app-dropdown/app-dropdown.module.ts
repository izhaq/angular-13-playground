import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { AppDropdownComponent } from './app-dropdown.component';

@NgModule({
  declarations: [AppDropdownComponent],
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  exports: [AppDropdownComponent],
})
export class AppDropdownModule {}
