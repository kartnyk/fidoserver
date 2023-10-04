import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FidoService {
  private apiUrl = 'http://localhost:3000/fido/register'; // replace with your backend API URL

  constructor(private http: HttpClient) {}

  generateRegistrationOptions(username: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generateRegistrationOptions`, {
      username,
    });
  }

  registerWithWebAuthn(publicKeyCredential: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/path-to-your-server-endpoint`,
      publicKeyCredential
    );
  }
}
