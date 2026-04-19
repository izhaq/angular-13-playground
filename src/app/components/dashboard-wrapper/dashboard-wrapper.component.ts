import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { DropdownOption } from '../app-dropdown/app-dropdown.models';
import { WsService } from './services/ws.service';
import { SCENARIOS } from './models/scenario.constants';
import { CmdSelection, DEFAULT_CMD_SELECTION } from './components/cmd-panel/cmd-panel.models';

@Component({
  selector: 'app-dashboard-wrapper',
  templateUrl: './dashboard-wrapper.component.html',
  styleUrls: ['./dashboard-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [WsService],
})
export class DashboardWrapperComponent implements OnInit, OnDestroy {
  readonly scenarioOptions: DropdownOption[] = SCENARIOS;

  private readonly scenarioSubject = new BehaviorSubject<string>('highway-cruise');
  readonly scenario$ = this.scenarioSubject.asObservable();
  readonly isRealtime$ = this.scenario$.pipe(map((s) => s === 'realtime'));

  // CMD selection is hoisted from per-tab to the wrapper (Version 2 UX): a single
  // CMD panel lives in the top bar instead of being duplicated inside each tab.
  // The current value flows down to both tabs via `[cmd]` input so the save
  // payload still includes it. The baseline tracks the last successful Save (or
  // a Default reset) and is restored on Cancel — matching the original per-tab
  // semantics, with last-save-wins across tabs.
  private readonly cmdSubject = new BehaviorSubject<CmdSelection>({ ...DEFAULT_CMD_SELECTION });
  private savedCmdBaseline: CmdSelection = { ...DEFAULT_CMD_SELECTION };
  readonly cmd$ = this.cmdSubject.asObservable();
  readonly saveBlocked$ = this.cmd$.pipe(
    map((cmd) => !cmd.sides.length || !cmd.wheels.length),
  );

  constructor(private readonly wsService: WsService) {}

  get selectedScenario(): string {
    return this.scenarioSubject.getValue();
  }

  get selectedCmd(): CmdSelection {
    return this.cmdSubject.getValue();
  }

  ngOnInit(): void {
    this.wsService.connect();
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }

  onScenarioChanged(value: string): void {
    this.scenarioSubject.next(value);
  }

  onCmdChanged(value: CmdSelection): void {
    this.cmdSubject.next(value);
  }

  onTabSaved(savedCmd: CmdSelection): void {
    this.savedCmdBaseline = { ...savedCmd };
  }

  onTabCancelled(): void {
    this.cmdSubject.next({ ...this.savedCmdBaseline });
  }

  onTabDefault(): void {
    this.cmdSubject.next({ ...DEFAULT_CMD_SELECTION });
    this.savedCmdBaseline = { ...DEFAULT_CMD_SELECTION };
  }
}
