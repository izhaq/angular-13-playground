import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppDropdownModule } from '../components/app-dropdown/app-dropdown.module';
import { AppMultiDropdownModule } from '../components/app-multi-dropdown/app-multi-dropdown.module';
import { AppDropdownCvaModule } from '../components/app-dropdown-cva/app-dropdown-cva.module';
import { SystemExperimentsModule } from '../features/system-experiments/system-experiments.module';

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
    // SystemExperimentsModule is imported here because the demo previews each
    // dumb system-experiments component in isolation (CMD section, footer, grid,
    // forms, board layout). The full <system-experiments-shell> lives on its own
    // page (`/system-experiments`) — see SystemExperimentsPageModule.
    SystemExperimentsModule,
  ],
  exports: [DemoPageComponent],
})
export class DemoPageModule {}
