import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-panel-footer',
  templateUrl: './panel-footer.component.html',
  styleUrls: ['./panel-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFooterComponent {
  @Input() disabled = false;

  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly defaultClicked = new EventEmitter<void>();
}
