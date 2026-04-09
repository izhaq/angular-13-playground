import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CmdPanelComponent } from './cmd-panel.component';
import { CmdPanelModule } from './cmd-panel.module';
import { DEFAULT_DRIVE_COMMAND } from './cmd-panel.models';

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

  it('should initialize with DEFAULT_DRIVE_COMMAND', () => {
    expect(component.value).toEqual(DEFAULT_DRIVE_COMMAND);
  });

  it('should expose separate transmission and drive mode options', () => {
    expect(component.transmissionOptions.length).toBeGreaterThan(0);
    expect(component.transmissionOptions[0].value).toBe('automatic');
    expect(component.driveModeOptions.length).toBeGreaterThan(0);
    expect(component.driveModeOptions[0].value).toBe('2wd');
  });

  it('onFieldChanged for transmission should update and emit', () => {
    const spy = spyOn(component.changed, 'emit');
    component.value = { transmission: 'automatic', driveMode: '2wd' };

    component.onFieldChanged('transmission', 'sport');

    expect(component.value).toEqual({ transmission: 'sport', driveMode: '2wd' });
    expect(spy).toHaveBeenCalledWith({ transmission: 'sport', driveMode: '2wd' });
  });

  it('onFieldChanged for driveMode should update and emit', () => {
    const spy = spyOn(component.changed, 'emit');
    component.value = { transmission: 'automatic', driveMode: '2wd' };

    component.onFieldChanged('driveMode', 'awd');

    expect(component.value).toEqual({ transmission: 'automatic', driveMode: 'awd' });
    expect(spy).toHaveBeenCalledWith({ transmission: 'automatic', driveMode: 'awd' });
  });

  it('disabled input should propagate to dropdowns', () => {
    component.disabled = true;
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('mat-select'));
    expect(selects.length).toBe(2);
    expect((selects[0].componentInstance as MatSelect).disabled).toBe(true);
    expect((selects[1].componentInstance as MatSelect).disabled).toBe(true);
  });

  it('should display DRIVE CMD label', () => {
    const label = fixture.nativeElement.querySelector('.cmd-panel__label');
    expect(label.textContent.trim()).toBe('DRIVE CMD');
  });
});
