import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { AppMultiDropdownComponent } from './app-multi-dropdown.component';

@NgModule({
  declarations: [AppMultiDropdownComponent],
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  exports: [AppMultiDropdownComponent],
})
export class AppMultiDropdownModule {}
