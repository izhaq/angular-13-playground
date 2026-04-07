import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { DropdownOption } from '../app-dropdown/app-dropdown.models';
import { DashboardFormValue, LeftPanelFormPayload } from './models/dashboard-form.models';
import { RowViewModel } from './models/grid.models';
import { DashboardFormService } from './services/dashboard-form.service';
import { StatusGridService } from './services/status-grid.service';
import { ACTIONS } from '../../mocks/mock-data';

interface DashboardViewModel {
  formState: DashboardFormValue;
  selectedAction: string;
}

@Component({
  selector: 'app-config-dashboard',
  templateUrl: './config-dashboard.component.html',
  styleUrls: ['./config-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigDashboardComponent implements OnInit, OnDestroy {
  readonly actionOptions: DropdownOption[] = ACTIONS;
  readonly cellColumnsTemplate: string;
  readonly columnCount: number;

  vm$!: Observable<DashboardViewModel>;
  gridRows$!: Observable<RowViewModel[]>;

  constructor(
    private readonly formService: DashboardFormService,
    private readonly gridService: StatusGridService,
  ) {
    this.cellColumnsTemplate = this.gridService.cellColumnsTemplate;
    this.columnCount = this.gridService.columnCount;
  }

  ngOnInit(): void {
    this.vm$ = this.formService.formState$.pipe(
      map((state) => ({ formState: state, selectedAction: state.action })),
    );

    this.gridRows$ = this.gridService.gridRows$;

    this.gridService.connect();
  }

  ngOnDestroy(): void {
    this.gridService.disconnect();
  }

  onActionChanged(value: string, currentState: DashboardFormValue): void {
    this.formService.updateFormState({ ...currentState, action: value });
  }

  onReset(): void {
    this.formService.resetToDefaults();
    this.gridService.resetToDefaults();
  }

  onFormChanged(partial: LeftPanelFormPayload, selectedAction: string): void {
    this.formService.updateFormState({
      action: selectedAction,
      commands: partial.commands,
      operations: partial.operations,
    });
  }

  onSaved(partial: LeftPanelFormPayload, selectedAction: string): void {
    this.formService.saveConfig({
      action: selectedAction,
      commands: partial.commands,
      operations: partial.operations,
    });
  }

  onCancelled(): void {
    this.formService.cancelChanges();
  }
}
