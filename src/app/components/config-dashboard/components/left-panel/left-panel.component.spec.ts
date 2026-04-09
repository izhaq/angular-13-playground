import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DashboardState, DriveCommand, LeftPanelPayload, VehicleControls } from '../../models/dashboard.models';
import { DEFAULT_DRIVE_COMMAND } from '../cmd-panel/cmd-panel.models';
import { DEFAULT_VEHICLE_CONTROLS } from '../operations-list/operations-list.models';
import { LeftPanelComponent } from './left-panel.component';

@Component({ selector: 'app-cmd-panel', template: '' })
class MockCmdPanelComponent {
  @Input() value!: DriveCommand;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<DriveCommand>();
}

@Component({ selector: 'app-operations-list', template: '' })
class MockOperationsListComponent {
  @Input() value!: VehicleControls;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<VehicleControls>();
}

function buildTestState(): DashboardState {
  return {
    scenario: 'city-traffic',
    driveCommand: { transmission: 'manual', driveMode: '4wd' },
    vehicleControls: {
      ...DEFAULT_VEHICLE_CONTROLS,
      terrain: ['gravel'],
      gear: 'd',
    },
  };
}

describe('LeftPanelComponent', () => {
  let fixture: ComponentFixture<LeftPanelComponent>;
  let component: LeftPanelComponent;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeftPanelComponent, MockCmdPanelComponent, MockOperationsListComponent],
      imports: [MatButtonModule, NoopAnimationsModule],
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

  it('should initialize with default drive command and vehicle controls', () => {
    expect(component.driveCommand).toEqual(DEFAULT_DRIVE_COMMAND);
    expect(component.vehicleControls).toEqual(DEFAULT_VEHICLE_CONTROLS);
  });

  it('dashboardState setter should update driveCommand and vehicleControls', () => {
    const state = buildTestState();
    component.dashboardState = state;

    expect(component.driveCommand).toEqual(state.driveCommand);
    expect(component.vehicleControls).toEqual(state.vehicleControls);
  });

  it('dashboardState setter should ignore null', () => {
    component.dashboardState = null;

    expect(component.driveCommand).toEqual(DEFAULT_DRIVE_COMMAND);
    expect(component.vehicleControls).toEqual(DEFAULT_VEHICLE_CONTROLS);
  });

  it('should pass driveCommand to app-cmd-panel', () => {
    const state = buildTestState();
    setInputAndDetect('dashboardState', state);

    const cmdPanel = fixture.debugElement.query(By.directive(MockCmdPanelComponent));
    expect(cmdPanel.componentInstance.value).toEqual(state.driveCommand);
  });

  it('should pass vehicleControls to app-operations-list', () => {
    const state = buildTestState();
    setInputAndDetect('dashboardState', state);

    const opsList = fixture.debugElement.query(By.directive(MockOperationsListComponent));
    expect(opsList.componentInstance.value).toEqual(state.vehicleControls);
  });

  it('should pass disabled to both child components', () => {
    setInputAndDetect('disabled', true);

    const cmdPanel = fixture.debugElement.query(By.directive(MockCmdPanelComponent));
    const opsList = fixture.debugElement.query(By.directive(MockOperationsListComponent));
    expect(cmdPanel.componentInstance.disabled).toBe(true);
    expect(opsList.componentInstance.disabled).toBe(true);
  });

  it('onDriveCommandChanged should update driveCommand and emit stateChanged', () => {
    const spy = spyOn(component.stateChanged, 'emit');
    const newCmd: DriveCommand = { transmission: 'sport', driveMode: 'awd' };

    component.onDriveCommandChanged(newCmd);

    expect(component.driveCommand).toEqual(newCmd);
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.calls.mostRecent().args[0] as LeftPanelPayload;
    expect(payload.driveCommand).toEqual(newCmd);
    expect(payload.vehicleControls).toEqual(DEFAULT_VEHICLE_CONTROLS);
  });

  it('onVehicleControlsChanged should update vehicleControls and emit stateChanged', () => {
    const spy = spyOn(component.stateChanged, 'emit');
    const newControls: VehicleControls = { ...DEFAULT_VEHICLE_CONTROLS, gear: 'd', speedLimit: '120' };

    component.onVehicleControlsChanged(newControls);

    expect(component.vehicleControls).toEqual(newControls);
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.calls.mostRecent().args[0] as LeftPanelPayload;
    expect(payload.vehicleControls).toEqual(newControls);
    expect(payload.driveCommand).toEqual(DEFAULT_DRIVE_COMMAND);
  });

  it('onSave should emit saved with current payload', () => {
    const spy = spyOn(component.saved, 'emit');
    const newCmd: DriveCommand = { transmission: 'eco', driveMode: '4wd' };
    component.onDriveCommandChanged(newCmd);

    component.onSave();

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.calls.mostRecent().args[0] as LeftPanelPayload;
    expect(payload.driveCommand).toEqual(newCmd);
  });

  it('onCancel should emit cancelled', () => {
    const spy = spyOn(component.cancelled, 'emit');

    component.onCancel();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when disabled is true', () => {
    setInputAndDetect('disabled', true);

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons.length).toBe(2);
    buttons.forEach(btn => {
      expect((btn.nativeElement as HTMLButtonElement).disabled).toBe(true);
    });
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

  it('clicking Save button should call onSave', () => {
    const spy = spyOn(component, 'onSave');
    fixture.detectChanges();

    const saveBtn = fixture.debugElement.queryAll(By.css('button'))[1];
    saveBtn.triggerEventHandler('click', null);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('clicking Cancel button should call onCancel', () => {
    const spy = spyOn(component, 'onCancel');
    fixture.detectChanges();

    const cancelBtn = fixture.debugElement.queryAll(By.css('button'))[0];
    cancelBtn.triggerEventHandler('click', null);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
