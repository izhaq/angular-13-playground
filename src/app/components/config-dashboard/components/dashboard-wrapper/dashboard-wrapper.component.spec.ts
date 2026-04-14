import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTabsModule } from '@angular/material/tabs';
import { By } from '@angular/platform-browser';

import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';
import { DashboardWrapperComponent } from './dashboard-wrapper.component';

@Component({ selector: 'app-top-bar', template: '' })
class MockTopBarComponent {
  @Input() selectedScenario = '';
  @Input() scenarioOptions: DropdownOption[] = [];
  @Output() scenarioChanged = new EventEmitter<string>();
}

@Component({ selector: 'app-config-dashboard', template: '' })
class MockConfigDashboardComponent {
  @Input() scenario = '';
  @Input() isRealtime = false;
}

describe('DashboardWrapperComponent', () => {
  let fixture: ComponentFixture<DashboardWrapperComponent>;
  let component: DashboardWrapperComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        DashboardWrapperComponent,
        MockTopBarComponent,
        MockConfigDashboardComponent,
      ],
      imports: [NoopAnimationsModule, MatTabsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render app-top-bar with scenario options', () => {
    const topBar = fixture.debugElement.query(By.directive(MockTopBarComponent));
    expect(topBar).toBeTruthy();
    expect(topBar.componentInstance.scenarioOptions.length).toBeGreaterThan(0);
  });

  it('should pass selectedScenario to app-top-bar', () => {
    const topBar = fixture.debugElement.query(By.directive(MockTopBarComponent));
    expect(topBar.componentInstance.selectedScenario).toBe('highway-cruise');
  });

  it('onScenarioChanged should update scenario$ and selectedScenario', () => {
    component.onScenarioChanged('realtime');
    expect(component.selectedScenario).toBe('realtime');
  });

  it('isRealtime$ should emit true when scenario is realtime', (done) => {
    component.onScenarioChanged('realtime');
    component.isRealtime$.subscribe((val) => {
      expect(val).toBe(true);
      done();
    });
  });

  it('isRealtime$ should emit false for non-realtime scenario', (done) => {
    component.onScenarioChanged('highway-cruise');
    component.isRealtime$.subscribe((val) => {
      expect(val).toBe(false);
      done();
    });
  });

  it('should render app-config-dashboard in first tab', () => {
    const dashboard = fixture.debugElement.query(By.directive(MockConfigDashboardComponent));
    expect(dashboard).toBeTruthy();
  });

  it('should pass scenario and isRealtime to app-config-dashboard', () => {
    const dashboard = fixture.debugElement.query(By.directive(MockConfigDashboardComponent));
    expect(dashboard.componentInstance.scenario).toBe('highway-cruise');
    expect(dashboard.componentInstance.isRealtime).toBe(false);
  });

  it('should render two tabs', () => {
    const tabLabels = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    expect(tabLabels.length).toBe(2);
  });

  it('should have tab labels "Frequent CMDs" and "Rare CMDs"', () => {
    const tabLabels = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    const labels = tabLabels.map((el) => el.nativeElement.textContent.trim());
    expect(labels).toEqual(['Frequent CMDs', 'Rare CMDs']);
  });
});
