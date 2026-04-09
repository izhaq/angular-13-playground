import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { AppDropdownComponent } from '../../../app-dropdown/app-dropdown.component';
import { TopBarComponent } from './top-bar.component';
import { TopBarModule } from './top-bar.module';

describe('TopBarComponent', () => {
  let component: TopBarComponent;
  let fixture: ComponentFixture<TopBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopBarModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBarComponent);
    component = fixture.componentInstance;
    component.scenarioOptions = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
    component.selectedScenario = 'a';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the Scenario dropdown', () => {
    const dropdown = fixture.debugElement.query(By.css('app-dropdown'));
    expect(dropdown).toBeTruthy();
    const label = fixture.nativeElement.querySelector('.app-dropdown-label');
    expect(label?.textContent?.trim()).toBe('Scenario');
  });

  it('should emit scenarioChanged when dropdown value changes', () => {
    const spy = jasmine.createSpy('scenarioChanged');
    component.scenarioChanged.subscribe(spy);
    const dropdown = fixture.debugElement.query(By.directive(AppDropdownComponent))
      .componentInstance as AppDropdownComponent;
    dropdown.changed.emit('b');
    expect(spy).toHaveBeenCalledWith('b');
  });

  it('should emit resetClicked when Reset is clicked', () => {
    const spy = jasmine.createSpy('resetClicked');
    component.resetClicked.subscribe(spy);
    const btn = fixture.debugElement.query(By.css('button[mat-button]'));
    btn.triggerEventHandler('click', null);
    expect(spy).toHaveBeenCalled();
  });

  it('should display Reset button text', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-button]');
    expect(btn?.textContent?.trim()).toBe('Reset');
  });
});
