import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  @Input() selectedScenario = '';
  @Input() scenarioOptions: DropdownOption[] = [];
  @Output() scenarioChanged = new EventEmitter<string>();
  @Output() resetClicked = new EventEmitter<void>();
}
