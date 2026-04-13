import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';

import { CmdTestPanelComponent } from './cmd-test-panel.component';
import { CmdTestPanelModule } from './cmd-test-panel.module';
import { CMD_TEST_FIELDS, CmdTestModel, DEFAULT_CMD_TEST } from './cmd-test-panel.models';

describe('CmdTestPanelComponent', () => {
  let component: CmdTestPanelComponent;
  let fixture: ComponentFixture<CmdTestPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CmdTestPanelModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CmdTestPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with DEFAULT_CMD_TEST', () => {
    expect(component.value).toEqual(DEFAULT_CMD_TEST);
  });

  it('should render 3 dropdowns', () => {
    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    expect(selects.length).toBe(3);
  });

  it('should render "CMD to test" heading', () => {
    const heading = fixture.nativeElement.querySelector('.cmd-test__heading');
    expect(heading.textContent.trim()).toBe('CMD to test');
  });

  it('should render correct labels', () => {
    const labels = fixture.nativeElement.querySelectorAll('.app-dropdown-label');
    expect(labels.length).toBe(3);
    const expectedLabels = CMD_TEST_FIELDS.map(f => f.label);
    for (let i = 0; i < 3; i++) {
      expect(labels[i].textContent?.trim()).toBe(expectedLabels[i]);
    }
  });

  it('all dropdowns should be single-select', () => {
    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    selects.forEach((de) => {
      expect((de.componentInstance as MatSelect).multiple).toBeFalsy();
    });
  });

  it('onControlChanged should update value and emit', () => {
    const spy = spyOn(component.changed, 'emit');
    component.value = { ...DEFAULT_CMD_TEST };

    component.onControlChanged('nta', 'yes');

    expect(component.value.nta).toBe('yes');
    expect(spy).toHaveBeenCalledTimes(1);
    const emitted = spy.calls.mostRecent().args[0] as CmdTestModel;
    expect(emitted.nta).toBe('yes');
  });

  it('disabled input should propagate to all dropdowns', () => {
    component.disabled = true;
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    expect(selects.length).toBe(3);
    selects.forEach((de) => {
      expect((de.componentInstance as MatSelect).disabled).toBe(true);
    });
  });

  it('setting value input should update the component', () => {
    const incoming: CmdTestModel = { nta: 'yes', tisMtrRec: 'yes', rideMtrRec: 'no' };
    component.value = incoming;
    expect(component.value).toEqual(incoming);
  });
});
