import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AppDropdownCvaDirective } from './app-dropdown-cva.directive';

@NgModule({
  declarations: [AppDropdownCvaDirective],
  imports: [ReactiveFormsModule],
  exports: [AppDropdownCvaDirective],
})
export class AppDropdownCvaModule {}
