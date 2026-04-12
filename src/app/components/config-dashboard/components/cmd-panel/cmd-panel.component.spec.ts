import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CmdPanelComponent } from './cmd-panel.component';
import { CmdPanelModule } from './cmd-panel.module';
import { DEFAULT_CMD_SELECTION } from './cmd-panel.models';

describe('CmdPanelComponent', () => {
  let component: CmdPanelComponent;
  let fixture: ComponentFixture<CmdPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CmdPanelModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CmdPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with DEFAULT_CMD_SELECTION', () => {
    expect(component.value).toEqual(DEFAULT_CMD_SELECTION);
  });

  it('should expose side and wheel options', () => {
    expect(component.sideOptions.length).toBe(2);
    expect(component.sideOptions[0].value).toBe('left');
    expect(component.sideOptions[1].value).toBe('right');
    expect(component.wheelOptions.length).toBe(4);
    expect(component.wheelOptions[0].value).toBe('1');
  });

  it('onSidesChanged should update sides and emit', () => {
    const spy = spyOn(component.changed, 'emit');

    component.onSidesChanged(['left', 'right']);

    expect(component.value.sides).toEqual(['left', 'right']);
    expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ sides: ['left', 'right'] }));
  });

  it('onWheelsChanged should update wheels and emit', () => {
    const spy = spyOn(component.changed, 'emit');

    component.onWheelsChanged(['1', '3']);

    expect(component.value.wheels).toEqual(['1', '3']);
    expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ wheels: ['1', '3'] }));
  });

  it('disabled input should propagate to multi-dropdowns', () => {
    component.disabled = true;
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    expect(selects.length).toBe(2);
    expect(selects[0].componentInstance.disabled).toBe(true);
    expect(selects[1].componentInstance.disabled).toBe(true);
  });

  it('should display CMD label', () => {
    const label = fixture.nativeElement.querySelector('.cmd-panel__label');
    expect(label.textContent.trim()).toBe('CMD');
  });

  it('both mat-selects should be multi-select', () => {
    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    expect(selects.length).toBe(2);
    selects.forEach(select => {
      expect((select.componentInstance as MatSelect).multiple).toBe(true);
    });
  });
});
