import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectChange, MatSelectModule } from '@angular/material/select';
import { By } from '@angular/platform-browser';

import { AppDropdownComponent } from './app-dropdown.component';

describe('AppDropdownComponent', () => {
  let component: AppDropdownComponent;
  let fixture: ComponentFixture<AppDropdownComponent>;
  let overlayContainerElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppDropdownComponent],
      imports: [
        CommonModule,
        MatSelectModule,
        MatFormFieldModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppDropdownComponent);
    component = fixture.componentInstance;
    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept initial value via @Input()', () => {
    component.value = 'action-2';
    fixture.detectChanges();
    expect(component.value).toBe('action-2');
  });

  it('should emit on @Output() changed when selection changes', () => {
    const changedSpy = jasmine.createSpy('changed');
    component.changed.subscribe(changedSpy);

    const change = new MatSelectChange({} as MatSelect, 'opt-2');
    component.onSelectionChange(change);

    expect(changedSpy).toHaveBeenCalledWith('opt-2');
    expect(component.value).toBe('opt-2');
  });

  it('should update internal value when @Input() value changes externally', () => {
    component.value = 'initial';
    fixture.detectChanges();
    expect(component.value).toBe('initial');

    component.value = 'updated';
    fixture.detectChanges();
    expect(component.value).toBe('updated');
  });

  it('should render options passed via @Input() options', fakeAsync(() => {
    component.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
    fixture.detectChanges();
    const matSelect = fixture.debugElement.query(By.css('mat-select'))
      .componentInstance as MatSelect;
    matSelect.open();
    fixture.detectChanges();
    tick();
    const options = overlayContainerElement.querySelectorAll('mat-option');
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('Alpha');
    expect(options[1].textContent).toContain('Beta');
  }));

  it('should display the label', () => {
    component.label = 'Choose one';
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.app-dropdown-label');
    expect(label?.textContent?.trim()).toBe('Choose one');
  });

  it('should disable the mat-select when disabled input is true', () => {
    component.disabled = true;
    fixture.detectChanges();
    const matSelect = fixture.debugElement.query(By.css('mat-select'))
      .componentInstance as MatSelect;
    expect(matSelect.disabled).toBe(true);
  });
});
