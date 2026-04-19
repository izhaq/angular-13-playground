import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckbox, MatCheckboxModule } from '@angular/material/checkbox';
import { By } from '@angular/platform-browser';

import { WsService } from './services/ws.service';
import { DashboardWrapperComponent } from './dashboard-wrapper.component';
import { CmdSelection, DEFAULT_CMD_SELECTION } from './components/cmd-panel/cmd-panel.models';
import { TestIdDirectiveModule } from '../../shared/directives/test-id.module';

@Component({ selector: 'app-cmd-panel', template: '' })
class MockCmdPanelComponent {
  @Input() value!: CmdSelection;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<CmdSelection>();
}

@Component({ selector: 'app-frequent-cmds-tab', template: '' })
class MockFrequentCmdsTabComponent {
  @Input() isRealtime = false;
  @Input() cmd: CmdSelection = { ...DEFAULT_CMD_SELECTION };
  @Input() saveBlocked = false;
  @Output() saved = new EventEmitter<CmdSelection>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();
}

@Component({ selector: 'app-rare-cmds-tab', template: '' })
class MockRareCmdsTabComponent {
  @Input() isRealtime = false;
  @Input() cmd: CmdSelection = { ...DEFAULT_CMD_SELECTION };
  @Input() saveBlocked = false;
  @Output() saved = new EventEmitter<CmdSelection>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();
}

describe('DashboardWrapperComponent', () => {
  let fixture: ComponentFixture<DashboardWrapperComponent>;
  let component: DashboardWrapperComponent;
  let wsService: jasmine.SpyObj<WsService>;

  beforeEach(async () => {
    wsService = jasmine.createSpyObj('WsService', ['connect', 'disconnect']);

    await TestBed.configureTestingModule({
      declarations: [
        DashboardWrapperComponent,
        MockCmdPanelComponent,
        MockFrequentCmdsTabComponent,
        MockRareCmdsTabComponent,
      ],
      imports: [NoopAnimationsModule, MatTabsModule, MatCheckboxModule, TestIdDirectiveModule],
    })
      .overrideComponent(DashboardWrapperComponent, {
        set: { providers: [{ provide: WsService, useValue: wsService }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call wsService.connect on init', () => {
    expect(wsService.connect).toHaveBeenCalledTimes(1);
  });

  it('should call wsService.disconnect on destroy', () => {
    fixture.destroy();
    expect(wsService.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should render the Realtime checkbox in the top bar', () => {
    const checkboxDe = fixture.debugElement.query(By.directive(MatCheckbox));
    expect(checkboxDe).toBeTruthy();
    // The visible label is projected as the checkbox content. We trim/match
    // to guard against inadvertent label drift while still allowing the
    // template author to pad whitespace around it.
    expect(checkboxDe.nativeElement.textContent.trim()).toContain('Realtime');
  });

  it('should render the shared app-cmd-panel in the top bar', () => {
    const cmdPanel = fixture.debugElement.query(By.directive(MockCmdPanelComponent));
    expect(cmdPanel).toBeTruthy();
    expect(cmdPanel.componentInstance.value).toEqual(DEFAULT_CMD_SELECTION);
    expect(cmdPanel.componentInstance.disabled).toBe(false);
  });

  it('selectedRealtime should default to false', () => {
    expect(component.selectedRealtime).toBe(false);
  });

  it('onRealtimeChanged should update isRealtime$ and selectedRealtime', (done) => {
    component.onRealtimeChanged(true);
    expect(component.selectedRealtime).toBe(true);
    component.isRealtime$.subscribe((val) => {
      expect(val).toBe(true);
      done();
    });
  });

  it('cmd panel should be disabled when realtime is on', () => {
    component.onRealtimeChanged(true);
    fixture.detectChanges();
    const cmdPanel = fixture.debugElement.query(By.directive(MockCmdPanelComponent));
    expect(cmdPanel.componentInstance.disabled).toBe(true);
  });

  it('checkbox change event should drive onRealtimeChanged', () => {
    spyOn(component, 'onRealtimeChanged').and.callThrough();
    const checkboxDe = fixture.debugElement.query(By.directive(MatCheckbox));
    // MatCheckbox emits a MatCheckboxChange object via (change). Simulating
    // through the rendered native input keeps us close to user behavior and
    // exercises the (change) binding wiring rather than the method directly.
    const input = checkboxDe.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    input.click();
    fixture.detectChanges();

    expect(component.onRealtimeChanged).toHaveBeenCalledWith(true);
    expect(component.selectedRealtime).toBe(true);
  });

  it('onCmdChanged should update selectedCmd and the cmd panel value', () => {
    const next: CmdSelection = { sides: ['right'], wheels: ['2', '3'] };
    component.onCmdChanged(next);
    fixture.detectChanges();

    expect(component.selectedCmd).toEqual(next);
    const cmdPanel = fixture.debugElement.query(By.directive(MockCmdPanelComponent));
    expect(cmdPanel.componentInstance.value).toEqual(next);
  });

  it('cmd$ should emit the updated cmd value after onCmdChanged', (done) => {
    const next: CmdSelection = { sides: ['left'], wheels: ['4'] };
    component.onCmdChanged(next);
    component.cmd$.subscribe((cmd) => {
      expect(cmd).toEqual(next);
      done();
    });
  });

  it('saveBlocked$ should be true when sides or wheels are empty', (done) => {
    component.onCmdChanged({ sides: [], wheels: ['1'] });
    component.saveBlocked$.subscribe((blocked) => {
      expect(blocked).toBe(true);
      done();
    });
  });

  it('saveBlocked$ should be false when both sides and wheels have selections', (done) => {
    component.onCmdChanged({ sides: ['left'], wheels: ['1'] });
    component.saveBlocked$.subscribe((blocked) => {
      expect(blocked).toBe(false);
      done();
    });
  });

  it('onTabSaved should set the saved baseline so subsequent cancel restores it', () => {
    const savedCmd: CmdSelection = { sides: ['left', 'right'], wheels: ['4'] };
    component.onTabSaved(savedCmd);
    component.onCmdChanged({ sides: [], wheels: [] });

    component.onTabCancelled();

    expect(component.selectedCmd).toEqual(savedCmd);
  });

  it('onTabCancelled should restore cmd to the last saved baseline (initially DEFAULT)', () => {
    component.onCmdChanged({ sides: ['right'], wheels: ['3'] });
    component.onTabCancelled();
    expect(component.selectedCmd).toEqual(DEFAULT_CMD_SELECTION);
  });

  it('onTabDefault should reset cmd and baseline to DEFAULT', () => {
    component.onTabSaved({ sides: ['right'], wheels: ['3'] });
    component.onCmdChanged({ sides: ['left', 'right'], wheels: ['1', '2'] });

    component.onTabDefault();

    expect(component.selectedCmd).toEqual(DEFAULT_CMD_SELECTION);

    // After Default, the new baseline is DEFAULT, so a follow-up Cancel must
    // also resolve to DEFAULT (not the previously-saved value).
    component.onCmdChanged({ sides: ['left'], wheels: ['1'] });
    component.onTabCancelled();
    expect(component.selectedCmd).toEqual(DEFAULT_CMD_SELECTION);
  });

  it('should render app-frequent-cmds-tab in first tab', () => {
    const dashboard = fixture.debugElement.query(By.directive(MockFrequentCmdsTabComponent));
    expect(dashboard).toBeTruthy();
  });

  it('should pass isRealtime, cmd, and saveBlocked to app-frequent-cmds-tab', () => {
    const dashboard = fixture.debugElement.query(By.directive(MockFrequentCmdsTabComponent));
    expect(dashboard.componentInstance.isRealtime).toBe(false);
    expect(dashboard.componentInstance.cmd).toEqual(DEFAULT_CMD_SELECTION);
    expect(dashboard.componentInstance.saveBlocked).toBe(false);
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
