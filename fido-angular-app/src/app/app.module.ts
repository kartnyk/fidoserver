import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Required for ngModel
import { HttpClientModule } from '@angular/common/http'; // Required for HttpClient

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { FidoService } from './fido.service';

@NgModule({
    declarations: [
        AppComponent,
        LoginComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule
    ],
    providers: [FidoService],
    bootstrap: [AppComponent]
})
export class AppModule { }
