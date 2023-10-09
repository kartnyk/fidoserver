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
        console.log('Authentication Options', response);
        this.startWebAuthnAuthentication(response);
      },
      (error) => {
        console.error('Error:', error);
        window.Error(error)
      }
    );
  }

  private startWebAuthnAuthentication(response: any) {
    const { challenge, allowCredentials, timeout, rpID, userVerification } =
      response;

    // type AllowedCredential = {
    //   type: string;
    //   id: string;
    //   transports: string[];
    // };

    // 2. Pass this response to webAuthn's browser API to Authenticate
    // let c =  Uint8Array.from(atob(challenge), (c) => c.charCodeAt(0))
    // console.log("cccccccccccccccc", c)
    // const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
    //   {
    //     challenge: Uint8Array.from(atob(challenge), (c) => c.charCodeAt(0)),
    //     allowCredentials: [],
    //     // allowCredentials: allowCredentials.map((cred: AllowedCredential) => ({
    //     //   type: cred.type as PublicKeyCredentialType,
    //     //   id: Uint8Array.from(atob(cred.id), (c) => c.charCodeAt(0)),
    //     //   transports: cred.transports as AuthenticatorTransport[],
    //     // })),
    //     timeout,
    //     rpId: rpID,
    //     userVerification: userVerification as UserVerificationRequirement,
    //   };
    response.challenge = this.base64ToBuffer(response.challenge);
    response.allowCredentials = response.allowCredentials.map((cred: any) => {
      if (typeof cred.id === 'string') {
          cred.id = this.base64ToBuffer(cred.id);
      }
      return cred;
  });
  
  
    console.log('Response after conversion', response);
    navigator.credentials
      .get({ publicKey: response })
      .then((credential: Credential | null) => {
        if (!credential) {
          console.error('No credentials returned from WebAuthn API');
          window.Error('Error Authenticating, Please Try Again!')
          return;
        }

        console.log(
          'Authentication credential array buffer ------------------------- =>',
          credential
        );
        const loggedInUser = this.username;
        console.log('loggedInUser', loggedInUser);

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

        console.log(
          'credential base64 for Authentication ------------------------------ =>',
          authenticationData
        );

        this.fidoService
          .authenticacteWithWebAuthn(authenticationData)
          .subscribe(
            (data) => {
              console.log(data);
              if (data.success) {
                window.alert("Authentication Success")
              } else {
                window.alert("Authentication Failed")
              }
            },
            (error) => {
              console.error('Error:', error);
              window.Error(error)
            }
          );
      })
      .catch((error) => {
        console.error('WebAuthn Authentication error:', error);
        window.Error(error)
      });
  }

  onRegister() {
    this.fidoService.generateRegistrationOptions(this.username).subscribe(
      (response) => {
        this.startWebAuthnRegistration(response);
      },
      (error) => {
        console.error('Error:', error);
        window.Error(error)
      }
    );
  }

  private startWebAuthnRegistration(response: any) {
    const loggedInUser = response.user.id;
    response.challenge = this.base64UrlToUint8Array(response.challenge);
    response.user.id = this.base64UrlToUint8Array(response.user.id);

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
          window.Error('Error while registering, Try again')
          return;
        }

        console.log(
          'Registration credential array buffer ------------------------- =>',
          credential
        );
        const publicKeyCredential = credential as PublicKeyCredential;
        const attestationResponse =
          publicKeyCredential.response as AuthenticatorAttestationResponse;

        const registrationData = {
          loggedInUser: loggedInUser,
          credential: {
            id: publicKeyCredential.id,
            type: publicKeyCredential.type,
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

        console.log(
          'credential base64 ------------------------------ =>',
          registrationData
        );

        this.fidoService.registerWithWebAuthn(registrationData).subscribe(
          (data) => {
            console.log(data);
            if (data.success) {
              window.alert("Registration Success")
            } else {
              window.alert("Registration Failed")
            }
          },
          (error) => {
            console.error('Error:', error);
            window.Error(error)
          }
        );
      })
      .catch((error) => {
        console.error('WebAuthn Registration error:', error);
        window.Error(error)
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
    console.log('base64', base64);
    console.log('safeBase64', safeBase64);
    const binaryString = atob(safeBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private base64UrlToBase64(base64Url: string): string {
    return (
      base64Url.replace(/-/g, '+').replace(/_/g, '/')
    );
  }

  // private safeAtob(base64: string): string {
  //   // Add padding to the Base64 string to make its length a multiple of 4
  //   while (base64.length % 4 !== 0) {
  //     base64 += '=';
  //   }
  //   return atob(base64);
  // }
}
