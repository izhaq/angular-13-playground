import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CmdSelection, CmdTestModel, DashboardState, LeftPanelPayload, FrequentOperationsModel } from '../../models/dashboard.models';
import { DEFAULT_CMD_SELECTION } from '../../../cmd-panel/cmd-panel.models';
import { DEFAULT_OPERATIONS } from '../frequent-operations-list/frequent-operations-list.models';
import { DEFAULT_CMD_TEST } from '../cmd-test-panel/cmd-test-panel.models';
import { LeftPanelComponent } from './left-panel.component';

@Component({ selector: 'app-cmd-panel', template: '' })
class MockCmdPanelComponent {
  @Input() value!: CmdSelection;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<CmdSelection>();
}

@Component({ selector: 'app-frequent-operations-list', template: '' })
class MockFrequentOperationsListComponent {
  @Input() value!: FrequentOperationsModel;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<FrequentOperationsModel>();
}

@Component({ selector: 'app-cmd-test-panel', template: '' })
class MockCmdTestPanelComponent {
  @Input() value!: CmdTestModel;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<CmdTestModel>();
}

@Component({ selector: 'app-panel-footer', template: '' })
class MockPanelFooterComponent {
  @Input() disabled = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();
}

function buildTestState(): DashboardState {
  return {
    scenario: 'city-traffic',
    cmd: { sides: ['left', 'right'], wheels: ['1', '2'] },
    operations: {
      ...DEFAULT_OPERATIONS,
      ttm: 'captive',
      force: 'force-f',
    },
    cmdTest: { ...DEFAULT_CMD_TEST, nta: 'yes' },
  };
}

describe('LeftPanelComponent', () => {
  let fixture: ComponentFixture<LeftPanelComponent>;
  let component: LeftPanelComponent;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        LeftPanelComponent,
        MockCmdPanelComponent,
        MockFrequentOperationsListComponent,
        MockCmdTestPanelComponent,
        MockPanelFooterComponent,
      ],
      imports: [NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LeftPanelComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  function setInputAndDetect(key: string, value: unknown): void {
    (component as unknown as Record<string, unknown>)[key] = value;
    cdr.markForCheck();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default cmd, operations, and cmdTest', () => {
    expect(component.cmd).toEqual(DEFAULT_CMD_SELECTION);
    expect(component.operations).toEqual(DEFAULT_OPERATIONS);
    expect(component.cmdTest).toEqual(DEFAULT_CMD_TEST);
  });

  it('dashboardState setter should update cmd, operations, and cmdTest', () => {
    const state = buildTestState();
    component.dashboardState = state;

    expect(component.cmd).toEqual(state.cmd);
    expect(component.operations).toEqual(state.operations);
    expect(component.cmdTest).toEqual(state.cmdTest);
  });

  it('dashboardState setter should reset to defaults on null', () => {
    component.dashboardState = null;

    expect(component.cmd).toEqual(DEFAULT_CMD_SELECTION);
    expect(component.operations).toEqual(DEFAULT_OPERATIONS);
    expect(component.cmdTest).toEqual(DEFAULT_CMD_TEST);
  });

  it('should pass cmd to app-cmd-panel', () => {
    const state = buildTestState();
    setInputAndDetect('dashboardState', state);

    const cmdPanel = fixture.debugElement.query(By.directive(MockCmdPanelComponent));
    expect(cmdPanel.componentInstance.value).toEqual(state.cmd);
  });

  it('should pass operations to app-operations-list', () => {
    const state = buildTestState();
    setInputAndDetect('dashboardState', state);

    const opsList = fixture.debugElement.query(By.directive(MockFrequentOperationsListComponent));
    expect(opsList.componentInstance.value).toEqual(state.operations);
  });

  it('should pass disabled to all child components including footer', () => {
    setInputAndDetect('disabled', true);

    const cmdPanel = fixture.debugElement.query(By.directive(MockCmdPanelComponent));
    const opsList = fixture.debugElement.query(By.directive(MockFrequentOperationsListComponent));
    const cmdTestPanel = fixture.debugElement.query(By.directive(MockCmdTestPanelComponent));
    const footer = fixture.debugElement.query(By.directive(MockPanelFooterComponent));
    expect(cmdPanel.componentInstance.disabled).toBe(true);
    expect(opsList.componentInstance.disabled).toBe(true);
    expect(cmdTestPanel.componentInstance.disabled).toBe(true);
    expect(footer.componentInstance.disabled).toBe(true);
  });

  it('onCmdChanged should update cmd and emit stateChanged', () => {
    const spy = spyOn(component.stateChanged, 'emit');
    const newCmd: CmdSelection = { sides: ['right'], wheels: ['2', '4'] };

    component.onCmdChanged(newCmd);

    expect(component.cmd).toEqual(newCmd);
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.calls.mostRecent().args[0] as LeftPanelPayload;
    expect(payload.cmd).toEqual(newCmd);
    expect(payload.operations).toEqual(DEFAULT_OPERATIONS);
  });

  it('onOperationsChanged should update operations and emit stateChanged', () => {
    const spy = spyOn(component.stateChanged, 'emit');
    const newOps: FrequentOperationsModel = { ...DEFAULT_OPERATIONS, force: 'force-f', stability: 'yes' };

    component.onOperationsChanged(newOps);

    expect(component.operations).toEqual(newOps);
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.calls.mostRecent().args[0] as LeftPanelPayload;
    expect(payload.operations).toEqual(newOps);
    expect(payload.cmd).toEqual(DEFAULT_CMD_SELECTION);
  });

  it('onSave should emit saved with current payload', () => {
    const spy = spyOn(component.saved, 'emit');
    const newCmd: CmdSelection = { sides: ['left'], wheels: ['3'] };
    component.onCmdChanged(newCmd);

    component.onSave();

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.calls.mostRecent().args[0] as LeftPanelPayload;
    expect(payload.cmd).toEqual(newCmd);
  });

  it('onCancel should emit cancelled', () => {
    const spy = spyOn(component.cancelled, 'emit');

    component.onCancel();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onDefault should emit defaultClicked', () => {
    const spy = spyOn(component.defaultClicked, 'emit');

    component.onDefault();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should render app-panel-footer', () => {
    const footer = fixture.debugElement.query(By.directive(MockPanelFooterComponent));
    expect(footer).toBeTruthy();
  });

  it('panel-footer saved event should call onSave', () => {
    const spy = spyOn(component, 'onSave');
    const footer = fixture.debugElement.query(By.directive(MockPanelFooterComponent));
    footer.componentInstance.saved.emit();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('panel-footer cancelled event should call onCancel', () => {
    const spy = spyOn(component, 'onCancel');
    const footer = fixture.debugElement.query(By.directive(MockPanelFooterComponent));
    footer.componentInstance.cancelled.emit();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('panel-footer defaultClicked event should call onDefault', () => {
    const spy = spyOn(component, 'onDefault');
    const footer = fixture.debugElement.query(By.directive(MockPanelFooterComponent));
    footer.componentInstance.defaultClicked.emit();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should apply disabled class to panel wrapper when disabled', () => {
    setInputAndDetect('disabled', true);

    const wrapper = fixture.debugElement.query(By.css('.panel-wrapper'));
    expect(wrapper.classes['panel-wrapper--disabled']).toBe(true);
  });

  it('should not apply disabled class when not disabled', () => {
    component.disabled = false;
    fixture.detectChanges();

    const wrapper = fixture.debugElement.query(By.css('.panel-wrapper'));
    expect(wrapper.classes['panel-wrapper--disabled']).toBeFalsy();
  });
});
