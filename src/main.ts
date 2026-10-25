import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { startDebugPanel } from './app/features/debug-panel';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Debug panel: started before bootstrap so startup requests are captured, and
// so it still works if bootstrap fails. Off unless the URL has ?debug=1.
const debugPanelProviders = startDebugPanel();

platformBrowserDynamic(debugPanelProviders)
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
