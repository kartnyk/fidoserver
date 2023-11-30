import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FidoService {
  // private apiUrl = 'http://localhost:3000/fido'; //For WSL
  private apiUrl = 'http://192.168.0.100:8080/fido';

  constructor(private http: HttpClient) {}

  generateRegistrationOptions(username: string): Observable<any> {
    const params = new HttpParams().set('username', username);
    return this.http.get<any>(`${this.apiUrl}/register/generateRegistrationOptions`, {
      params,
    });
  }

  registerWithWebAuthn(publicKeyCredential: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/register/verifyRegistrationData`,
      publicKeyCredential
    );
  }

  generateAuthenticationOptions(username: string): Observable<any> {
    const params = new HttpParams().set('username', username);
    return this.http.get<any>(`${this.apiUrl}/authenticate/generateAuthenticationOptions`, {
      params,
    });
  }

  authenticacteWithWebAuthn(publicKeyCredential: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/authenticate/verifyAuthenticationData`,
      publicKeyCredential,
    );
  }
}
