import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CmdFormPanelComponent } from './cmd-form-panel.component';
import { CmdFormPanelModule } from './cmd-form-panel.module';

describe('CmdFormPanelComponent', () => {
  let component: CmdFormPanelComponent;
  let fixture: ComponentFixture<CmdFormPanelComponent>;
  let onChangeSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CmdFormPanelModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CmdFormPanelComponent);
    component = fixture.componentInstance;
    onChangeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(onChangeSpy);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use co-located cmdOptions', () => {
    expect(component.cmdOptions.length).toBeGreaterThan(0);
    expect(component.cmdOptions[0].value).toBeTruthy();
  });

  it('writeValue should set form controls', () => {
    component.writeValue({ cmd1: 'x', cmd2: 'y' });
    expect(component.form.value).toEqual({ cmd1: 'x', cmd2: 'y' });
  });

  it('changing cmd1 control should emit updated CommandPair', () => {
    component.writeValue({ cmd1: 'a', cmd2: 'b' });
    onChangeSpy.calls.reset();

    component.form.controls['cmd1'].setValue('b');

    expect(onChangeSpy).toHaveBeenCalledWith({ cmd1: 'b', cmd2: 'b' });
  });

  it('changing cmd2 control should emit updated CommandPair', () => {
    component.writeValue({ cmd1: 'a', cmd2: 'b' });
    onChangeSpy.calls.reset();

    component.form.controls['cmd2'].setValue('a');

    expect(onChangeSpy).toHaveBeenCalledWith({ cmd1: 'a', cmd2: 'a' });
  });

  it('setDisabledState should disable both dropdowns', () => {
    component.setDisabledState(true);
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('mat-select'));
    expect(selects.length).toBe(2);
    expect((selects[0].componentInstance as MatSelect).disabled).toBe(true);
    expect((selects[1].componentInstance as MatSelect).disabled).toBe(true);
  });
});
