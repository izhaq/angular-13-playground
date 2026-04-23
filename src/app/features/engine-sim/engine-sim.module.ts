import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { webSocket } from 'rxjs/webSocket';

import { AppMultiDropdownModule } from '../../components/app-multi-dropdown/app-multi-dropdown.module';
import { BoardFooterComponent } from './components/board-footer/board-footer.component';
import { CmdSectionComponent } from './components/cmd-section/cmd-section.component';
import { EngineSimBoardComponent } from './components/engine-sim-board/engine-sim-board.component';
import { StatusGridComponent } from './components/status-grid/status-grid.component';
import { EngineSimResponse } from './shared/engine-sim.api-contract';
import { ENGINE_SIM_WS_FACTORY, EngineSimWebSocketFactory } from './shared/engine-sim.tokens';
import { EngineSimApiService } from './services/engine-sim-api.service';
import { EngineSimDataService } from './services/engine-sim-data.service';

/**
 * Default factory used in production. Tests override via TestBed providers.
 *
 * Note: `ENGINE_SIM_API_CONFIG` is intentionally NOT provided here. The host
 * project supplies its own URL config at module setup, e.g.
 *   `EngineSimModule, { provide: ENGINE_SIM_API_CONFIG, useValue: { … } }`
 * — keeps the feature URL-agnostic and migration-portable.
 */
const defaultWebSocketFactory: EngineSimWebSocketFactory =
  (url: string) => webSocket<EngineSimResponse>(url).asObservable();

@NgModule({
  declarations: [
    BoardFooterComponent,
    CmdSectionComponent,
    EngineSimBoardComponent,
    StatusGridComponent,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    MatButtonModule,
    AppMultiDropdownModule,
  ],
  exports: [
    BoardFooterComponent,
    CmdSectionComponent,
    EngineSimBoardComponent,
    StatusGridComponent,
  ],
  providers: [
    EngineSimApiService,
    EngineSimDataService,
    { provide: ENGINE_SIM_WS_FACTORY, useValue: defaultWebSocketFactory },
  ],
})
export class EngineSimModule {}
