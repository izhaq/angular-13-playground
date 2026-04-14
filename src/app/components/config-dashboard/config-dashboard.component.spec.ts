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

  it('should default scenario to highway-cruise and isRealtime to false', () => {
    expect(component.scenario).toBe('highway-cruise');
    expect(component.isRealtime).toBe(false);
  });

  it('should call gridService.configure and connect on init', () => {
    expect(gridService.configure).toHaveBeenCalledTimes(1);
    expect(gridService.connect).toHaveBeenCalledTimes(1);
  });

  it('should call gridService.disconnect on destroy', () => {
    fixture.destroy();
    expect(gridService.disconnect).toHaveBeenCalledTimes(1);
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
