import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppDropdownModule } from '../components/app-dropdown/app-dropdown.module';
import { AppMultiDropdownModule } from '../components/app-multi-dropdown/app-multi-dropdown.module';
import { AppDropdownCvaModule } from '../components/app-dropdown-cva/app-dropdown-cva.module';

import { DemoPageComponent } from './demo-page.component';

@NgModule({
  declarations: [DemoPageComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AppDropdownModule,
    AppMultiDropdownModule,
    AppDropdownCvaModule,
  ],
  exports: [DemoPageComponent],
})
export class DemoPageModule {}
