import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectChange, MatSelectModule } from '@angular/material/select';
import { By } from '@angular/platform-browser';

import { AppMultiDropdownComponent } from './app-multi-dropdown.component';

describe('AppMultiDropdownComponent', () => {
  let component: AppMultiDropdownComponent;
  let fixture: ComponentFixture<AppMultiDropdownComponent>;
  let overlayContainerElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppMultiDropdownComponent],
      imports: [
        CommonModule,
        MatSelectModule,
        MatFormFieldModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppMultiDropdownComponent);
    component = fixture.componentInstance;
    overlayContainerElement = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept initial value array via @Input()', () => {
    component.value = ['a', 'b'];
    fixture.detectChanges();
    expect(component.value).toEqual(['a', 'b']);
  });

  it('should emit on @Output() changed when selection changes', () => {
    const changedSpy = jasmine.createSpy('changed');
    component.changed.subscribe(changedSpy);

    const change = new MatSelectChange({} as MatSelect, ['a', 'c']);
    component.onSelectionChange(change);

    expect(changedSpy).toHaveBeenCalledWith(['a', 'c']);
    expect(component.value).toEqual(['a', 'c']);
  });

  it('should render options passed via @Input() options', fakeAsync(() => {
    component.options = [
      { value: 'x', label: 'X-ray' },
      { value: 'y', label: 'Yankee' },
      { value: 'z', label: 'Zulu' },
    ];
    fixture.detectChanges();
    const matSelect = fixture.debugElement.query(By.css('mat-select'))
      .componentInstance as MatSelect;
    matSelect.open();
    fixture.detectChanges();
    tick();
    const options = overlayContainerElement.querySelectorAll('mat-option');
    expect(options.length).toBe(3);
    expect(options[0].textContent).toContain('X-ray');
    expect(options[1].textContent).toContain('Yankee');
    expect(options[2].textContent).toContain('Zulu');
  }));

  it('should display the label', () => {
    component.label = 'Select multiple';
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.app-dropdown-label');
    expect(label?.textContent?.trim()).toBe('Select multiple');
  });

  it('should have multiple selection enabled', () => {
    fixture.detectChanges();
    const matSelect = fixture.debugElement.query(By.css('mat-select'))
      .componentInstance as MatSelect;
    expect(matSelect.multiple).toBe(true);
  });

  it('should disable the mat-select when disabled input is true', () => {
    component.disabled = true;
    fixture.detectChanges();
    const matSelect = fixture.debugElement.query(By.css('mat-select'))
      .componentInstance as MatSelect;
    expect(matSelect.disabled).toBe(true);
  });
});
