import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DashboardState, LeftPanelPayload } from './models/dashboard.models';
import { DEFAULT_STATE } from './models/dashboard-defaults';
import { DashboardStateService } from './services/dashboard-state.service';
import { StatusGridService } from './components/status-grid/status-grid.service';
import { ConfigDashboardComponent } from './config-dashboard.component';
import { DEFAULT_CMD_SELECTION } from './components/cmd-panel/cmd-panel.models';
import { DEFAULT_OPERATIONS } from './components/operations-list/operations-list.models';
import { DEFAULT_CMD_TEST } from './components/cmd-test-panel/cmd-test-panel.models';

@Component({ selector: 'app-top-bar', template: '' })
class MockTopBarComponent {
  @Input() selectedScenario = '';
  @Input() scenarioOptions: unknown[] = [];
  @Output() scenarioChanged = new EventEmitter<string>();
}

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

describe('ConfigDashboardComponent', () => {
  let fixture: ComponentFixture<ConfigDashboardComponent>;
  let component: ConfigDashboardComponent;
  let stateService: jasmine.SpyObj<DashboardStateService>;
  let gridService: jasmine.SpyObj<StatusGridService>;
  let stateSubject: BehaviorSubject<DashboardState>;

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<DashboardState>({ ...DEFAULT_STATE });

    stateService = jasmine.createSpyObj('DashboardStateService',
      ['updateState', 'saveConfig', 'cancelChanges', 'resetToDefaults'],
      { state$: stateSubject.asObservable() },
    );

    gridService = jasmine.createSpyObj('StatusGridService',
      ['connect', 'disconnect', 'resetToDefaults', 'configure'],
      { gridRows$: new BehaviorSubject([]).asObservable() },
    );

    await TestBed.configureTestingModule({
      declarations: [
        ConfigDashboardComponent,
        MockTopBarComponent,
        MockLeftPanelComponent,
        MockStatusGridComponent,
      ],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: DashboardStateService, useValue: stateService },
      ],
    })
      .overrideComponent(ConfigDashboardComponent, {
        set: { providers: [{ provide: StatusGridService, useValue: gridService }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ConfigDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call gridService.configure and connect on init', () => {
    expect(gridService.configure).toHaveBeenCalledTimes(1);
    expect(gridService.connect).toHaveBeenCalledTimes(1);
  });

  it('should call gridService.disconnect on destroy', () => {
    fixture.destroy();
    expect(gridService.disconnect).toHaveBeenCalledTimes(1);
  });

  it('dashboardView$ should emit state and isRealtime false for non-realtime scenario', (done) => {
    component.dashboardView$.subscribe(vm => {
      expect(vm.state).toEqual(DEFAULT_STATE);
      expect(vm.isRealtime).toBe(false);
      done();
    });
  });

  it('dashboardView$ should emit isRealtime true when scenario is realtime', (done) => {
    const realtimeState: DashboardState = { ...DEFAULT_STATE, scenario: 'realtime' };
    stateSubject.next(realtimeState);

    component.dashboardView$.subscribe(vm => {
      expect(vm.isRealtime).toBe(true);
      done();
    });
  });

  it('onScenarioChanged should call stateService.updateState with updated scenario', () => {
    const currentState = { ...DEFAULT_STATE };
    component.onScenarioChanged('city-traffic', currentState);

    expect(stateService.updateState).toHaveBeenCalledWith({
      ...currentState,
      scenario: 'city-traffic',
    });
  });

  it('onDefault should call stateService.resetToDefaults only (not gridService)', () => {
    component.onDefault();

    expect(stateService.resetToDefaults).toHaveBeenCalledTimes(1);
    expect(gridService.resetToDefaults).not.toHaveBeenCalled();
  });

  it('onStateChanged should call stateService.updateState with built state', () => {
    const partial: LeftPanelPayload = {
      cmd: { sides: ['right'], wheels: ['3', '4'] },
      operations: DEFAULT_OPERATIONS,
      cmdTest: DEFAULT_CMD_TEST,
    };

    component.onStateChanged(partial, 'highway-cruise');

    expect(stateService.updateState).toHaveBeenCalledWith({
      scenario: 'highway-cruise',
      cmd: partial.cmd,
      operations: partial.operations,
      cmdTest: partial.cmdTest,
    });
  });

  it('onSaved should call stateService.saveConfig with built state', () => {
    const partial: LeftPanelPayload = {
      cmd: DEFAULT_CMD_SELECTION,
      operations: { ...DEFAULT_OPERATIONS, force: 'force-f' },
      cmdTest: { ...DEFAULT_CMD_TEST, nta: 'yes' },
    };

    component.onSaved(partial, 'off-road-trail');

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

  it('should expose SCENARIOS as scenarioOptions', () => {
    expect(component.scenarioOptions.length).toBeGreaterThan(0);
    expect(component.scenarioOptions.find(o => o.value === 'realtime')).toBeTruthy();
  });
});
