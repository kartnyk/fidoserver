import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FidoService {
  private apiUrl = 'http://localhost:3000/fido';

  constructor(private http: HttpClient) {}

  generateRegistrationOptions(username: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register/generateRegistrationOptions`, {
      username,
    });
  }

  registerWithWebAuthn(publicKeyCredential: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/register/verifyRegistrationData`,
      publicKeyCredential
    );
  }

  generateAuthenticationOptions(username: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/authenticate/generateAuthenticationOptions`, {
      username,
    });
  }

  authenticacteWithWebAuthn(publicKeyCredential: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/authenticate/verifyAuthenticationData`,
      publicKeyCredential,
    );
  }
}
