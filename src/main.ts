import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { startDebugPanel } from './app/features/debug-panel';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Debug panel: started before bootstrap, and bootstrap waits for it, so a page
// that starts switched on records its first requests too; it also works if
// bootstrap fails. Off unless ?debug=1 or Ctrl+Alt+Shift+A turned it on.
const debugPanel = startDebugPanel();

debugPanel.ready
  .then(() => platformBrowserDynamic(debugPanel.providers).bootstrapModule(AppModule))
  .catch(err => console.error(err));
