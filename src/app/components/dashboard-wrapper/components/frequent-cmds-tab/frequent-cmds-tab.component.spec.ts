import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DashboardState, LeftPanelPayload } from './models/dashboard.models';
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
  @Input() disabled = false;
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
      ['updateState', 'saveConfig', 'cancelChanges', 'resetToDefaults'],
      { state$: stateSubject.asObservable() },
    );

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

  it('should default scenario to highway-cruise and isRealtime to false', () => {
    expect(component.scenario).toBe('highway-cruise');
    expect(component.isRealtime).toBe(false);
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

  it('onDefault should call stateService.resetToDefaults only (not gridService)', () => {
    component.onDefault();

    expect(stateService.resetToDefaults).toHaveBeenCalledTimes(1);
    expect(gridService.resetToDefaults).not.toHaveBeenCalled();
  });

  it('onStateChanged should call stateService.updateState with scenario from input', () => {
    component.scenario = 'city-traffic';
    const partial: LeftPanelPayload = {
      cmd: { sides: ['right'], wheels: ['3', '4'] },
      operations: DEFAULT_OPERATIONS,
      cmdTest: DEFAULT_CMD_TEST,
    };

    component.onStateChanged(partial);

    expect(stateService.updateState).toHaveBeenCalledWith({
      scenario: 'city-traffic',
      cmd: partial.cmd,
      operations: partial.operations,
      cmdTest: partial.cmdTest,
    });
  });

  it('onSaved should call stateService.saveConfig with scenario from input', () => {
    component.scenario = 'off-road-trail';
    const partial: LeftPanelPayload = {
      cmd: DEFAULT_CMD_SELECTION,
      operations: { ...DEFAULT_OPERATIONS, force: 'force-f' },
      cmdTest: { ...DEFAULT_CMD_TEST, nta: 'yes' },
    };

    component.onSaved(partial);

    expect(stateService.saveConfig).toHaveBeenCalledWith({
      scenario: 'off-road-trail',
      cmd: partial.cmd,
      operations: partial.operations,
      cmdTest: partial.cmdTest,
    });
  });

  it('onCancelled should call stateService.cancelChanges', () => {
    component.onCancelled();

    expect(stateService.cancelChanges).toHaveBeenCalledTimes(1);
  });

  it('dashboardState$ should emit current state from service', (done) => {
    component.dashboardState$.subscribe((state) => {
      expect(state).toEqual(DEFAULT_STATE);
      done();
    });
  });
});
