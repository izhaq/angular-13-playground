import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { ConfigDashboardModule } from './components/config-dashboard/config-dashboard.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ConfigDashboardModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
