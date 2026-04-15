import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RareDashboardState, RareLeftPanelPayload } from './models/rare-dashboard.models';
import { RARE_DEFAULT_STATE } from './models/rare-dashboard-defaults';
import { TAB_STATE_CONFIG } from '../../services/tab-state.config';
import { TabStateService } from '../../services/tab-state.service';
import { WsService } from '../../services/ws.service';
import { StatusGridService } from '../status-grid/services/status-grid.service';
import { FieldUpdate } from '../status-grid/models/grid.models';
import { RareCmdsTabComponent } from './rare-cmds-tab.component';
import { DEFAULT_CMD_SELECTION } from '../cmd-panel/cmd-panel.models';
import { DEFAULT_RARE_OPERATIONS } from './components/rare-operations-list/rare-operations-list.models';

@Component({ selector: 'app-rare-left-panel', template: '' })
class MockRareLeftPanelComponent {
  @Input() dashboardState: RareDashboardState | null = null;
  @Input() disabled = false;
  @Output() stateChanged = new EventEmitter<RareLeftPanelPayload>();
  @Output() saved = new EventEmitter<RareLeftPanelPayload>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();
}

@Component({ selector: 'app-status-grid', template: '' })
class MockStatusGridComponent {
  @Input() config: unknown;
  @Input() rows: unknown[] = [];
}

describe('RareCmdsTabComponent', () => {
  let fixture: ComponentFixture<RareCmdsTabComponent>;
  let component: RareCmdsTabComponent;
  let stateService: jasmine.SpyObj<TabStateService<RareDashboardState>>;
  let gridService: jasmine.SpyObj<StatusGridService>;
  let wsMessageSubject: Subject<FieldUpdate>;
  let stateSubject: BehaviorSubject<RareDashboardState>;

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<RareDashboardState>({ ...RARE_DEFAULT_STATE });
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
        RareCmdsTabComponent,
        MockRareLeftPanelComponent,
        MockStatusGridComponent,
      ],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: WsService, useValue: wsService },
      ],
    })
      .overrideComponent(RareCmdsTabComponent, {
        set: {
          providers: [
            { provide: TabStateService, useValue: stateService },
            { provide: StatusGridService, useValue: gridService },
            { provide: TAB_STATE_CONFIG, useValue: { defaultState: RARE_DEFAULT_STATE, apiUrl: '/api/rare-config' } },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RareCmdsTabComponent);
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
    const update: FieldUpdate = { field: 'absCalibration', cells: { L1: { value: 'yes', abbr: 'YES' } } };
    wsMessageSubject.next(update);

    expect(gridService.applyUpdate).toHaveBeenCalledWith(update);
  });

  it('should unsubscribe from WsService on destroy', () => {
    const update: FieldUpdate = { field: 'absCalibration', cells: { L1: { value: 'yes', abbr: 'YES' } } };
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
    const partial: RareLeftPanelPayload = {
      cmd: { sides: ['right'], wheels: ['3', '4'] },
      rareOperations: DEFAULT_RARE_OPERATIONS,
    };

    component.onStateChanged(partial);

    expect(stateService.updateState).toHaveBeenCalledWith({
      scenario: 'city-traffic',
      cmd: partial.cmd,
      rareOperations: partial.rareOperations,
    });
  });

  it('onSaved should call stateService.saveConfig with scenario from input', () => {
    component.scenario = 'off-road-trail';
    const partial: RareLeftPanelPayload = {
      cmd: DEFAULT_CMD_SELECTION,
      rareOperations: { ...DEFAULT_RARE_OPERATIONS, brakeBleed: 'yes' },
    };

    component.onSaved(partial);

    expect(stateService.saveConfig).toHaveBeenCalledWith({
      scenario: 'off-road-trail',
      cmd: partial.cmd,
      rareOperations: partial.rareOperations,
    });
  });

  it('onCancelled should call stateService.cancelChanges', () => {
    component.onCancelled();

    expect(stateService.cancelChanges).toHaveBeenCalledTimes(1);
  });

  it('dashboardState$ should emit current state from service', (done) => {
    component.dashboardState$.subscribe((state) => {
      expect(state).toEqual(RARE_DEFAULT_STATE);
      done();
    });
  });
});
