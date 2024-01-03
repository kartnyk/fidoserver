import { Component } from '@angular/core';
import { FidoService } from '../fido.service';
import * as webauthn from '@github/webauthn-json';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  username: string = '';

  constructor(private fidoService: FidoService) {}

  onLogin() {
    this.fidoService.generateAuthenticationOptions(this.username).subscribe(
      (response) => {
        this.startWebAuthnAuthentication(response);
      },
      (error) => {
        console.error('Error:', error);
        window.Error(error);
      }
    );
  }

  private startWebAuthnAuthentication(response: any) {
    response = response.publicKeyCredentialRequestOptions
    const { challenge, allowCredentials, timeout, rpID, userVerification } =
      response;
    console.log("response.challenge", challenge)
    response.challenge = this.base64ToBuffer(response.challenge);
    // response.allowCredentials = [];
    response.allowCredentials = response.allowCredentials.map((cred: any) => {
      if (typeof cred.id === 'string') {
        cred.id = this.base64ToBuffer(cred.id);
      }
      delete cred.transports;
      return cred;
    });
    // Added this delete as for Java based libraray without the deleted extensions would cause 
    // the operation to timeout or not allowed exception, need to figure out what these extensions are
    if (response.extensions && response.extensions.appid === null 
      && response.extensions.largeBlob === null) {
      delete response.extensions.appid;
      delete response.extensions.largeBlob;
    }
    console.log("response", response)
    navigator.credentials
      .get({ publicKey: response })
      .then((credential: Credential | null) => {
        console.log("cresenetials", credential)
        if (!credential) {
          console.error('No credentials returned from WebAuthn API');
          window.Error('Error Authenticating, Please Try Again!');
          return;
        }
        const loggedInUser = this.username;
        console.log("loggedInUser during Authentication", loggedInUser)
        const publicKeyCredential = credential as PublicKeyCredential;
        const assertionResponse =
          publicKeyCredential.response as AuthenticatorAssertionResponse;

        const authenticationData = {
          loggedInUser: loggedInUser,
          credential: {
            authenticatorAttachment:
              publicKeyCredential.authenticatorAttachment,
            id: publicKeyCredential.id,
            type: publicKeyCredential.type,
            rawId: this.base64urlEncode(
              new Uint8Array(publicKeyCredential.rawId)
            ),
            response: {
              authenticatorData: this.base64urlEncode(
                new Uint8Array(assertionResponse.authenticatorData)
              ),
              clientDataJSON: this.base64urlEncode(
                new Uint8Array(assertionResponse.clientDataJSON)
              ),
              signature: this.base64urlEncode(
                new Uint8Array(assertionResponse.signature)
              ),
              userHandle: assertionResponse.userHandle
                ? this.base64urlEncode(
                    new Uint8Array(assertionResponse.userHandle)
                  )
                : null,
            },
          },
        };

        this.fidoService
          .authenticacteWithWebAuthn(authenticationData)
          .subscribe(
            (data) => {
              if (data.success) {
                window.alert('Authentication Success');
              } else {
                window.alert('Authentication Failed');
              }
            },
            (error) => {
              console.error('Error:', error);
              window.Error(error);
            }
          );
      })
      .catch((error) => {
        console.error('WebAuthn Authentication error:', error);
        window.Error(error);
      });
  }

  onRegister() {
    this.fidoService.generateRegistrationOptions(this.username).subscribe(
      (response) => {
        this.startWebAuthnRegistration(response);
      },
      (error) => {
        console.error('Error:', error);
        window.Error(error);
      }
    );
  }

  private async startWebAuthnRegistration(response: any) {
    const loggedInUser = response.user.id;
    console.log("loggedInUser during Registration", loggedInUser)

    response.challenge = this.base64UrlToUint8Array(response.challenge);
    response.user.id = this.base64UrlToUint8Array(response.user.id);

    // if (response.excludeCredentials) {
    //   for (let cred of response.excludeCredentials) {
    //     cred.id = this.base64UrlToUint8Array(cred.id);
    //   }
    //   delete cred.transports;
    // }

    if (response.excludeCredentials) {
      response.excludeCredentials = response.excludeCredentials.map((cred: any) => {
        if (typeof cred.id === 'string') {
          cred.id = this.base64ToBuffer(cred.id);
        }
        delete cred.transports;
        return cred;
      });
    }

    // response.allowCredentials = response.allowCredentials.map((cred: any) => {
    //   if (typeof cred.id === 'string') {
    //     cred.id = this.base64ToBuffer(cred.id);
    //   }
    //   delete cred.transports;
    //   return cred;
    // });
    // Added this delete as for Java based libraray without the deleted extensions would cause 
    // the operation to timeout or not allowed exception, need to figure out what these extensions are
    if (response.extensions && response.extensions.appidExclude === null 
      && response.extensions.largeBlob === null) {
      delete response.extensions.appidExclude;
      delete response.extensions.largeBlob;
    }
    
    navigator.credentials
      .create({ publicKey: response })
      .then((credential: Credential | null) => {
        if (!credential) {
          console.error('No credentials returned from WebAuthn API');
          window.Error('Error while registering, Try again');
          return;
        }
        const publicKeyCredential = credential as PublicKeyCredential;
        const attestationResponse =
          publicKeyCredential.response as AuthenticatorAttestationResponse;

        const registrationData = {
          loggedInUser: loggedInUser,
          credential: {
            id: publicKeyCredential.id,
            type: publicKeyCredential.type,
            clientExtensionResults: publicKeyCredential.getClientExtensionResults(),
            rawId: this.base64urlEncode(
              new Uint8Array(publicKeyCredential.rawId)
            ),
            response: {
              clientDataJSON: this.base64urlEncode(
                new Uint8Array(attestationResponse.clientDataJSON)
              ),
              attestationObject: this.base64urlEncode(
                new Uint8Array(attestationResponse.attestationObject)
              ),
            },
          },
        };
        this.fidoService.registerWithWebAuthn(registrationData).subscribe(
          (data) => {
            if (data.success) {
              window.alert('Registration Success');
            } else {
              window.alert('Registration Failed');
            }
          },
          (error) => {
            console.error('Error:', error);
            window.Error(error);
          }
        );
      })
      .catch((error) => {
        console.error('WebAuthn Registration error:', error);
        window.Error(error);
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

  private base64urlEncode(data: Uint8Array): string {
    let base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const safeBase64 = this.base64UrlToBase64(base64);
    const binaryString = atob(safeBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private base64UrlToBase64(base64Url: string): string {
    console.log("base64Url string", base64Url)
    return base64Url.replace(/-/g, '+').replace(/_/g, '/');
  }
}
