import { Component } from '@angular/core';
import { FidoService } from '../fido.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  username: string = '';

  constructor(private fidoService: FidoService) {}

  onLogin() {
    this.fidoService.generateRegistrationOptions(this.username).subscribe(
      (response) => {
        this.startWebAuthnRegistration(response);
      },
      (error) => {
        console.error('Error:', error);
      }
    );
  }

  private startWebAuthnRegistration(response: any) {
    response.challenge = this.base64UrlToUint8Array(response.challenge);

    if (response.excludeCredentials) {
      for (let cred of response.excludeCredentials) {
        cred.id = this.base64UrlToUint8Array(cred.id);
      }
    }

    navigator.credentials
      .create({ publicKey: response })
      .then((credential: Credential | null) => {
        if (!credential) {
          console.error('No credentials returned from WebAuthn API');
          return;
        }

        const publicKeyCredential = credential as PublicKeyCredential;
        const attestationResponse =
          publicKeyCredential.response as AuthenticatorAttestationResponse;

        const registrationData = {
          id: publicKeyCredential.id,
          type: publicKeyCredential.type,
          rawId: Array.from(new Uint8Array(publicKeyCredential.rawId)),
          response: {
            clientDataJSON: Array.from(
              new Uint8Array(attestationResponse.clientDataJSON)
            ),
            attestationObject: Array.from(
              new Uint8Array(attestationResponse.attestationObject)
            ),
          },
        };

        this.fidoService.registerWithWebAuthn(registrationData).subscribe(
          (data) => {
            console.log(data);
            // Handle server response here
          },
          (error) => {
            console.error('Error:', error);
          }
        );
      })
      .catch((error) => {
        console.error('WebAuthn error:', error);
      });
  }

  private base64UrlToUint8Array(base64UrlData: string): Uint8Array {
    const padding = '='.repeat((4 - (base64UrlData.length % 4)) % 4);
    const base64 =
      base64UrlData.replace(/-/g, '+').replace(/_/g, '/') + padding;
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
