import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { PanelFooterComponent } from './panel-footer.component';
import { PanelFooterModule } from './panel-footer.module';

describe('PanelFooterComponent', () => {
  let fixture: ComponentFixture<PanelFooterComponent>;
  let component: PanelFooterComponent;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelFooterModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelFooterComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  function getButtonByText(text: string): HTMLButtonElement | null {
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    return Array.from(buttons).find(b => b.textContent?.trim() === text) ?? null;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render three buttons: Default, Cancel, Save', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.panel-footer button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent.trim()).toBe('Default');
    expect(buttons[1].textContent.trim()).toBe('Cancel');
    expect(buttons[2].textContent.trim()).toBe('Save');
  });

  it('should disable all buttons when disabled is true', () => {
    component.disabled = true;
    cdr.markForCheck();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    buttons.forEach((btn: HTMLButtonElement) => {
      expect(btn.disabled).toBe(true);
    });
  });

  it('should enable all buttons when disabled is false', () => {
    component.disabled = false;
    cdr.markForCheck();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons.forEach((btn: HTMLButtonElement) => {
      expect(btn.disabled).toBe(false);
    });
  });

  it('clicking Default should emit defaultClicked', () => {
    const spy = spyOn(component.defaultClicked, 'emit');
    getButtonByText('Default')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('clicking Cancel should emit cancelled', () => {
    const spy = spyOn(component.cancelled, 'emit');
    getButtonByText('Cancel')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('clicking Save should emit saved', () => {
    const spy = spyOn(component.saved, 'emit');
    getButtonByText('Save')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
