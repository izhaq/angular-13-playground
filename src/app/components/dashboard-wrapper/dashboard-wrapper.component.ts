import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { WsService } from './services/ws.service';
import { CmdSelection, DEFAULT_CMD_SELECTION } from './components/cmd-panel/cmd-panel.models';

@Component({
  selector: 'app-dashboard-wrapper',
  templateUrl: './dashboard-wrapper.component.html',
  styleUrls: ['./dashboard-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [WsService],
})
export class DashboardWrapperComponent implements OnInit, OnDestroy {
  // Realtime is now a single boolean. The previous scenario dropdown carried
  // 4 values (highway-cruise / city-traffic / off-road-trail / realtime) but
  // only the realtime branch ever gated UI behavior, so the model collapses
  // to a checkbox. The boolean flows down to both tabs and into the save
  // payload directly (replacing the old `scenario: string` field).
  private readonly isRealtimeSubject = new BehaviorSubject<boolean>(false);
  readonly isRealtime$ = this.isRealtimeSubject.asObservable();

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

  get selectedRealtime(): boolean {
    return this.isRealtimeSubject.getValue();
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

  onRealtimeChanged(value: boolean): void {
    this.isRealtimeSubject.next(value);
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
