import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { webSocket } from 'rxjs/webSocket';

import {
  AppDropdownCvaModule,
  AppDropdownModule,
  AppMultiDropdownModule,
} from './_external/ui-primitives';
import { PrimaryCommandsFormComponent } from './boards/primary-commands/primary-commands-form/primary-commands-form.component';
import { SecondaryCommandsFormComponent } from './boards/secondary-commands/secondary-commands-form/secondary-commands-form.component';
import { BoardFooterComponent } from './components/board-footer/board-footer.component';
import { CmdSectionComponent } from './components/cmd-section/cmd-section.component';
import { BoardComponent } from './components/board/board.component';
import { SystemExperimentsShellComponent } from './system-experiments-shell/system-experiments-shell.component';
import { StatusGridComponent } from './components/status-grid/status-grid.component';
import { SystemExperimentsResponse } from './api/api-contract';
import { SYSTEM_EXPERIMENTS_WS_FACTORY, SystemExperimentsWebSocketFactory } from './api/api-tokens';
import { SystemExperimentsApiService } from './api/system-experiments-api.service';
import { SystemExperimentsDataService } from './api/system-experiments-data.service';

/**
 * Default factory used in production. Tests override via TestBed providers.
 *
 * Note: `SYSTEM_EXPERIMENTS_API_CONFIG` is intentionally NOT provided here. The host
 * project supplies its own URL config at module setup, e.g.
 *   `SystemExperimentsModule, { provide: SYSTEM_EXPERIMENTS_API_CONFIG, useValue: { … } }`
 * — keeps the feature URL-agnostic and migration-portable.
 */
const defaultWebSocketFactory: SystemExperimentsWebSocketFactory =
  (url: string) => webSocket<SystemExperimentsResponse>(url).asObservable();

@NgModule({
  declarations: [
    BoardComponent,
    BoardFooterComponent,
    CmdSectionComponent,
    SystemExperimentsShellComponent,
    PrimaryCommandsFormComponent,
    SecondaryCommandsFormComponent,
    StatusGridComponent,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatTabsModule,
    AppDropdownModule,
    AppMultiDropdownModule,
    AppDropdownCvaModule,
  ],
  exports: [
    BoardComponent,
    BoardFooterComponent,
    CmdSectionComponent,
    SystemExperimentsShellComponent,
    PrimaryCommandsFormComponent,
    SecondaryCommandsFormComponent,
    StatusGridComponent,
  ],
  providers: [
    SystemExperimentsApiService,
    SystemExperimentsDataService,
    { provide: SYSTEM_EXPERIMENTS_WS_FACTORY, useValue: defaultWebSocketFactory },
  ],
})
export class SystemExperimentsModule {}
