import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';

import { OperationsListComponent } from './operations-list.component';
import { OperationsListModule } from './operations-list.module';
import { DEFAULT_OPERATIONS, OPERATIONS_FIELDS, OperationsValue } from './operations-list.models';

describe('OperationsListComponent', () => {
  let component: OperationsListComponent;
  let fixture: ComponentFixture<OperationsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsListModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with DEFAULT_OPERATIONS', () => {
    expect(component.value).toEqual(DEFAULT_OPERATIONS);
  });

  it('setting value input should update the component', () => {
    const incoming: OperationsValue = {
      ttm: 'captive', weather: 'yes', videoRec: 'external', videoType: ['hd', '4k'],
      headlights: 'yes', pwrOnOff: 'off', force: 'force-f', stability: 'yes',
      cruiseCtrl: 'yes', plr: 'yes', aux: 'yes',
    };
    component.value = incoming;
    expect(component.value).toEqual(incoming);
  });

  it('onControlChanged should update a single-select key and emit', () => {
    const spy = spyOn(component.changed, 'emit');
    component.value = { ...DEFAULT_OPERATIONS };

    component.onControlChanged('force', 'force-f');

    expect(component.value.force).toBe('force-f');
    expect(spy).toHaveBeenCalledTimes(1);
    const emitted = spy.calls.mostRecent().args[0] as OperationsValue;
    expect(emitted.force).toBe('force-f');
  });

  it('onControlChanged should update the multi-select key (videoType) and emit', () => {
    const spy = spyOn(component.changed, 'emit');
    component.value = { ...DEFAULT_OPERATIONS };

    component.onControlChanged('videoType', ['hd', '4k']);

    expect(component.value.videoType).toEqual(['hd', '4k']);
    expect(spy).toHaveBeenCalledTimes(1);
    const emitted = spy.calls.mostRecent().args[0] as OperationsValue;
    expect(emitted.videoType).toEqual(['hd', '4k']);
  });

  it('disabled input should propagate to all 11 dropdowns', () => {
    component.disabled = true;
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    expect(selects.length).toBe(11);
    selects.forEach((de) => {
      expect((de.componentInstance as MatSelect).disabled).toBe(true);
    });
  });

  it('should render 11 rows with correct labels', () => {
    const labels = fixture.nativeElement.querySelectorAll('.app-dropdown-label');
    expect(labels.length).toBe(11);
    const expectedLabels = OPERATIONS_FIELDS.map(f => f.label);
    for (let i = 0; i < 11; i++) {
      expect(labels[i].textContent?.trim()).toBe(expectedLabels[i]);
    }
  });

  it('only dropdown 4 (Video Type) should be multi-select', () => {
    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    expect(selects.length).toBe(11);
    selects.forEach((de, i) => {
      const isMulti = (de.componentInstance as MatSelect).multiple;
      if (i === 3) {
        expect(isMulti).toBe(true);
      } else {
        expect(isMulti).toBeFalsy();
      }
    });
  });
});
