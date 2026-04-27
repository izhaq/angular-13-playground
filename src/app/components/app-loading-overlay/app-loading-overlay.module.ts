import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppLoadingOverlayComponent } from './app-loading-overlay.component';

@NgModule({
  declarations: [AppLoadingOverlayComponent],
  imports: [CommonModule],
  exports: [AppLoadingOverlayComponent],
})
export class AppLoadingOverlayModule {}
