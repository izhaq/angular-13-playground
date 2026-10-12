import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import {
  installDebugCapture,
  isDebugRequested,
  provideDebugCaptureSession,
} from './app/features/debug-capture';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Installed before bootstrap so startup requests are captured, and so the
// capture survives a bootstrap failure (export still works by shortcut).
const debugCapture = isDebugRequested() ? installDebugCapture() : null;

platformBrowserDynamic([provideDebugCaptureSession(debugCapture)])
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
