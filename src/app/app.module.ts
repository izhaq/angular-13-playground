import { provideHttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DemoPageModule } from './demo/demo-page.module';
import { provideAuth } from './features/auth/auth.providers';
import { SessionIndicatorComponent } from './features/auth/session-indicator/session-indicator.component';
import { provideDebugCapture } from './features/debug-capture';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    DemoPageModule,
    AppRoutingModule,
    // Standalone component used by the NgModule-declared AppComponent's
    // template — standalone components are imported, not declared.
    SessionIndicatorComponent,
  ],
  // provideAuth() also provides the HttpClient (with the 401 interceptor
  // attached) — HttpClientModule is gone on purpose; re-importing it would
  // drop the interceptor. With auth switched off (environment.authEnabled)
  // the app gets a plain HttpClient instead: no startup session call, no
  // 401 redirect to a login page that is not registered.
  providers: [
    environment.authEnabled ? provideAuth() : provideHttpClient(),
    // Records errors Angular catches itself — only when main.ts started a capture.
    provideDebugCapture(),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
