import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppDropdownModule } from '../components/app-dropdown/app-dropdown.module';
import { AppMultiDropdownModule } from '../components/app-multi-dropdown/app-multi-dropdown.module';
import { AppDropdownCvaModule } from '../components/app-dropdown-cva/app-dropdown-cva.module';
import { EngineSimModule } from '../features/engine-sim/engine-sim.module';

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
    // EngineSimModule is imported here because the demo previews each
    // dumb engine-sim component in isolation (CMD section, footer, grid,
    // forms, board layout). The full <engine-sim-shell> lives on its own
    // page (`/engine-sim`) — see EngineSimPageModule.
    EngineSimModule,
  ],
  exports: [DemoPageComponent],
})
export class DemoPageModule {}
