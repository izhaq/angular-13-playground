import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RareCmdsTabComponent } from './rare-cmds-tab.component';

describe('RareCmdsTabComponent', () => {
  let fixture: ComponentFixture<RareCmdsTabComponent>;
  let component: RareCmdsTabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RareCmdsTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RareCmdsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default scenario to empty and isRealtime to false', () => {
    expect(component.scenario).toBe('');
    expect(component.isRealtime).toBe(false);
  });

  it('should render placeholder text', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.rare-cmds-tab__placeholder')?.textContent).toContain('coming soon');
  });
});
