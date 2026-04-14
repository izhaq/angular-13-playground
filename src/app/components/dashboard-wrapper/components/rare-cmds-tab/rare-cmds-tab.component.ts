import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-rare-cmds-tab',
  templateUrl: './rare-cmds-tab.component.html',
  styleUrls: ['./rare-cmds-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RareCmdsTabComponent {
  @Input() scenario = '';
  @Input() isRealtime = false;
}
