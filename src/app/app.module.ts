import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DemoPageModule } from './demo/demo-page.module';
import { provideAuth } from './features/auth/auth.providers';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    DemoPageModule,
    AppRoutingModule,
  ],
  providers: [provideAuth()],
  bootstrap: [AppComponent],
})
export class AppModule {}
