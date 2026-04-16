import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RareDashboardState, RareLeftPanelPayload, RareOperationsModel } from '../../models/rare-dashboard.models';
import { DEFAULT_RARE_OPERATIONS } from '../rare-operations-list/rare-operations-list.models';
import { RareLeftPanelComponent } from './rare-left-panel.component';

@Component({ selector: 'app-rare-operations-list', template: '' })
class MockRareOperationsListComponent {
  @Input() value!: RareOperationsModel;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<RareOperationsModel>();
}

@Component({ selector: 'app-panel-footer', template: '' })
class MockPanelFooterComponent {
  @Input() disabled = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();
}

function buildTestState(): RareDashboardState {
  return {
    scenario: 'city-traffic',
    cmd: { sides: ['left', 'right'], wheels: ['1', '2'] },
    rareOperations: {
      ...DEFAULT_RARE_OPERATIONS,
      absCriticalFail: 'force',
      brakeCriticalFail: 'force',
    },
  };
}

describe('RareLeftPanelComponent', () => {
  let fixture: ComponentFixture<RareLeftPanelComponent>;
  let component: RareLeftPanelComponent;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        RareLeftPanelComponent,
        MockRareOperationsListComponent,
        MockPanelFooterComponent,
      ],
      imports: [NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RareLeftPanelComponent);
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

  it('should initialize with default rareOperations', () => {
    expect(component.rareOperations).toEqual(DEFAULT_RARE_OPERATIONS);
  });

  it('dashboardState setter should update rareOperations', () => {
    const state = buildTestState();
    component.dashboardState = state;

    expect(component.rareOperations).toEqual(state.rareOperations);
  });

  it('dashboardState setter should reset to defaults on null', () => {
    component.dashboardState = null;

    expect(component.rareOperations).toEqual(DEFAULT_RARE_OPERATIONS);
  });

  it('should pass rareOperations to app-rare-operations-list', () => {
    const state = buildTestState();
    setInputAndDetect('dashboardState', state);

    const opsList = fixture.debugElement.query(By.directive(MockRareOperationsListComponent));
    expect(opsList.componentInstance.value).toEqual(state.rareOperations);
  });

  it('should pass disabled to all child components including footer', () => {
    setInputAndDetect('disabled', true);

    const opsList = fixture.debugElement.query(By.directive(MockRareOperationsListComponent));
    const footer = fixture.debugElement.query(By.directive(MockPanelFooterComponent));
    expect(opsList.componentInstance.disabled).toBe(true);
    expect(footer.componentInstance.disabled).toBe(true);
  });

  it('onRareOperationsChanged should update rareOperations and emit stateChanged', () => {
    const spy = spyOn(component.stateChanged, 'emit');
    const newOps: RareOperationsModel = { ...DEFAULT_RARE_OPERATIONS, busTempFail: 'force', masterResetFail: 'ignore' };

    component.onRareOperationsChanged(newOps);

    expect(component.rareOperations).toEqual(newOps);
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.calls.mostRecent().args[0] as RareLeftPanelPayload;
    expect(payload.rareOperations).toEqual(newOps);
  });

  it('onSave should emit saved with current payload', () => {
    const spy = spyOn(component.saved, 'emit');
    const newOps: RareOperationsModel = { ...DEFAULT_RARE_OPERATIONS, absCriticalFail: 'ignore' };
    component.onRareOperationsChanged(newOps);

    component.onSave();

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.calls.mostRecent().args[0] as RareLeftPanelPayload;
    expect(payload.rareOperations).toEqual(newOps);
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
