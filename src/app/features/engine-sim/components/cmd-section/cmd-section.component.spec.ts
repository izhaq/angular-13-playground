import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { AppMultiDropdownModule } from '../../../../components/app-multi-dropdown/app-multi-dropdown.module';
import { AppMultiDropdownComponent } from '../../../../components/app-multi-dropdown/app-multi-dropdown.component';
import { SIDE, WHEEL } from '../../shared/option-values';
import { CmdSectionComponent } from './cmd-section.component';

describe('CmdSectionComponent', () => {
  let fixture: ComponentFixture<CmdSectionComponent>;
  let component: CmdSectionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CmdSectionComponent],
      imports: [NoopAnimationsModule, AppMultiDropdownModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CmdSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function dropdown(testId: string): AppMultiDropdownComponent {
    return fixture.debugElement.query(
      By.css(`app-multi-dropdown[testid="${testId}"]`),
    ).componentInstance;
  }

  it('renders one Side and one Wheel dropdown with stable test ids', () => {
    expect(dropdown('cmd-side-select')).toBeTruthy();
    expect(dropdown('cmd-wheel-select')).toBeTruthy();
  });

  it('seeds dropdowns from @Input() selection', () => {
    component.selection = { sides: [SIDE.Left], wheels: [WHEEL.W1, WHEEL.W3] };
    fixture.detectChanges();

    expect(dropdown('cmd-side-select').value).toEqual([SIDE.Left]);
    expect(dropdown('cmd-wheel-select').value).toEqual([WHEEL.W1, WHEEL.W3]);
  });

  it('emits selectionChange merging new sides with existing wheels', () => {
    component.selection = { sides: [], wheels: [WHEEL.W2] };
    let emitted: { sides: string[]; wheels: string[] } | undefined;
    component.selectionChange.subscribe(v => (emitted = v));

    component.onSidesChange([SIDE.Left, SIDE.Right]);

    expect(emitted).toEqual({
      sides: [SIDE.Left, SIDE.Right],
      wheels: [WHEEL.W2],
    });
  });

  it('emits selectionChange merging new wheels with existing sides', () => {
    component.selection = { sides: [SIDE.Right], wheels: [] };
    let emitted: { sides: string[]; wheels: string[] } | undefined;
    component.selectionChange.subscribe(v => (emitted = v));

    component.onWheelsChange([WHEEL.W4]);

    expect(emitted).toEqual({
      sides: [SIDE.Right],
      wheels: [WHEEL.W4],
    });
  });

  it('propagates @Input() disabled to both dropdowns', () => {
    component.disabled = true;
    fixture.detectChanges();

    expect(dropdown('cmd-side-select').disabled).toBe(true);
    expect(dropdown('cmd-wheel-select').disabled).toBe(true);
  });
});
