import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppDropdownModule } from '../../../app-dropdown/app-dropdown.module';
import { TopBarComponent } from './top-bar.component';

@NgModule({
  declarations: [TopBarComponent],
  imports: [CommonModule, AppDropdownModule],
  exports: [TopBarComponent],
})
export class TopBarModule {}
