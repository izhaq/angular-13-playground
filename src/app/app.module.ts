import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DemoPageModule } from './demo/demo-page.module';
import { provideAuth } from './features/auth/auth.providers';
import { SessionIndicatorComponent } from './features/auth/session-indicator/session-indicator.component';

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
  // drop the interceptor.
  providers: [provideAuth()],
  bootstrap: [AppComponent],
})
export class AppModule {}
