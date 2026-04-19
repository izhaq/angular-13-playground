import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CmdSelection, DashboardState, LeftPanelPayload } from './models/dashboard.models';
import { DEFAULT_STATE } from './models/dashboard-defaults';
import { TAB_STATE_CONFIG } from '../../services/tab-state.config';
import { TabStateService } from '../../services/tab-state.service';
import { WsService } from '../../services/ws.service';
import { StatusGridService } from '../status-grid/services/status-grid.service';
import { FieldUpdate } from '../status-grid/models/grid.models';
import { FrequentCmdsTabComponent } from './frequent-cmds-tab.component';
import { DEFAULT_CMD_SELECTION } from '../cmd-panel/cmd-panel.models';
import { DEFAULT_OPERATIONS } from './components/frequent-operations-list/frequent-operations-list.models';
import { DEFAULT_CMD_TEST } from './components/cmd-test-panel/cmd-test-panel.models';

@Component({ selector: 'app-left-panel', template: '' })
class MockLeftPanelComponent {
  @Input() dashboardState: DashboardState | null = null;
  @Input() readOnly = false;
  @Input() saveBlocked = false;
  @Output() stateChanged = new EventEmitter<LeftPanelPayload>();
  @Output() saved = new EventEmitter<LeftPanelPayload>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();
}

@Component({ selector: 'app-status-grid', template: '' })
class MockStatusGridComponent {
  @Input() config: unknown;
  @Input() rows: unknown[] = [];
}

describe('FrequentCmdsTabComponent', () => {
  let fixture: ComponentFixture<FrequentCmdsTabComponent>;
  let component: FrequentCmdsTabComponent;
  let stateService: jasmine.SpyObj<TabStateService<DashboardState>>;
  let gridService: jasmine.SpyObj<StatusGridService>;
  let wsMessageSubject: Subject<FieldUpdate>;
  let stateSubject: BehaviorSubject<DashboardState>;

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<DashboardState>({ ...DEFAULT_STATE });
    wsMessageSubject = new Subject<FieldUpdate>();

    stateService = jasmine.createSpyObj('TabStateService',
      ['updateState', 'saveConfig', 'cancelChanges', 'resetToDefaults', 'getCurrentState', 'getSavedBaseline'],
      { state$: stateSubject.asObservable() },
    );
    stateService.getCurrentState.and.returnValue({ ...DEFAULT_STATE });
    stateService.cancelChanges.and.returnValue({ ...DEFAULT_STATE });

    gridService = jasmine.createSpyObj('StatusGridService',
      ['resetToDefaults', 'configure', 'applyUpdate'],
      { gridRows$: new BehaviorSubject([]).asObservable() },
    );

    const wsService = { message$: wsMessageSubject.asObservable() };

    await TestBed.configureTestingModule({
      declarations: [
        FrequentCmdsTabComponent,
        MockLeftPanelComponent,
        MockStatusGridComponent,
      ],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: WsService, useValue: wsService },
      ],
    })
      .overrideComponent(FrequentCmdsTabComponent, {
        set: {
          providers: [
            { provide: TabStateService, useValue: stateService },
            { provide: StatusGridService, useValue: gridService },
            { provide: TAB_STATE_CONFIG, useValue: { defaultState: DEFAULT_STATE, apiUrl: '/api/config' } },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FrequentCmdsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default isRealtime to false', () => {
    expect(component.isRealtime).toBe(false);
  });

  it('should default cmd to DEFAULT_CMD_SELECTION and saveBlocked to false', () => {
    expect(component.cmd).toEqual(DEFAULT_CMD_SELECTION);
    expect(component.saveBlocked).toBe(false);
  });

  it('should call gridService.configure on init', () => {
    expect(gridService.configure).toHaveBeenCalledTimes(1);
  });

  it('should forward WsService messages to gridService.applyUpdate', () => {
    const update: FieldUpdate = { field: 'ttm', cells: { L1: { value: 'captive', abbr: 'CAP' } } };
    wsMessageSubject.next(update);

    expect(gridService.applyUpdate).toHaveBeenCalledWith(update);
  });

  it('should unsubscribe from WsService on destroy', () => {
    const update: FieldUpdate = { field: 'ttm', cells: { L1: { value: 'captive', abbr: 'CAP' } } };
    fixture.destroy();
    wsMessageSubject.next(update);

    expect(gridService.applyUpdate).not.toHaveBeenCalled();
  });

  it('onDefault should call stateService.resetToDefaults and emit defaultClicked', () => {
    spyOn(component.defaultClicked, 'emit');

    component.onDefault();

    expect(stateService.resetToDefaults).toHaveBeenCalledTimes(1);
    expect(gridService.resetToDefaults).not.toHaveBeenCalled();
    expect(component.defaultClicked.emit).toHaveBeenCalledTimes(1);
  });

  it('onStateChanged should call stateService.updateState with isRealtime and cmd from inputs', () => {
    component.isRealtime = true;
    component.cmd = { sides: ['right'], wheels: ['2'] };
    const partial: LeftPanelPayload = {
      operations: DEFAULT_OPERATIONS,
      cmdTest: DEFAULT_CMD_TEST,
    };

    component.onStateChanged(partial);

    expect(stateService.updateState).toHaveBeenCalledWith({
      isRealtime: true,
      cmd: { sides: ['right'], wheels: ['2'] },
      operations: partial.operations,
      cmdTest: partial.cmdTest,
    });
  });

  it('onSaved should call stateService.saveConfig with input cmd and emit saved with cmd', () => {
    component.isRealtime = false;
    const inputCmd: CmdSelection = { sides: ['left', 'right'], wheels: ['1', '4'] };
    component.cmd = inputCmd;
    spyOn(component.saved, 'emit');
    const partial: LeftPanelPayload = {
      operations: { ...DEFAULT_OPERATIONS },
      cmdTest: { ...DEFAULT_CMD_TEST },
    };

    component.onSaved(partial);

    expect(stateService.saveConfig).toHaveBeenCalledWith({
      isRealtime: false,
      cmd: inputCmd,
      operations: partial.operations,
      cmdTest: partial.cmdTest,
    });
    expect(component.saved.emit).toHaveBeenCalledWith(inputCmd);
  });

  it('onCancelled should call stateService.cancelChanges and emit cancelled', () => {
    spyOn(component.cancelled, 'emit');

    component.onCancelled();

    expect(stateService.cancelChanges).toHaveBeenCalledTimes(1);
    expect(component.cancelled.emit).toHaveBeenCalledTimes(1);
  });

  it('dashboardState$ should emit current state from service', (done) => {
    component.dashboardState$.subscribe((state) => {
      expect(state).toEqual(DEFAULT_STATE);
      done();
    });
  });
});
