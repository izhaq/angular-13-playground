import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-panel-footer',
  templateUrl: './panel-footer.component.html',
  styleUrls: ['./panel-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFooterComponent {
  @Input() disabled = false;

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();
}
