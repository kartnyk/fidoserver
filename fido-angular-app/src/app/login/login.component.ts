import { Component } from '@angular/core';
import { FidoService } from '../fido.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  username: string = '';
  isLoading: boolean = false; // Added to track when loading starts and ends.
  webAuthnSupported: boolean = false;
  private passkeyPromptTriggered: boolean = false; // To prevent multiple prompts

  constructor(private fidoService: FidoService) {}

  ngOnInit(): void {
    this.checkWebAuthnSupport();
  }

  // checkWebAuthnSupport(): void {
  //   this.webAuthnSupported =
  //     'PublicKeyCredential' in window &&
  //     typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
  //       'function';
  // }

  checkWebAuthnSupport(): void {
    if ('PublicKeyCredential' in window) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          this.webAuthnSupported = available;
        })
        .catch((error) => {
          console.error('Error checking WebAuthn support', error);
          this.webAuthnSupported = false;
        });
    }
  }

  triggerPasskeyPrompt(): void {
    if (this.passkeyPromptTriggered || !this.webAuthnSupported) return;
    this.passkeyPromptTriggered = true;

    // Simulate getting WebAuthn request options from your service
    this.onLogin(true);
  }

  onRegister() {
    if (!this.username) {
      window.alert('Please enter a username.');
      return;
    }
    this.isLoading = true; // Start loading
    this.fidoService.generateRegistrationOptions(this.username).subscribe(
      (response) => {
        // Handle the response and start WebAuthn Registration
        this.startWebAuthnRegistration(response);
      },
      (error) => {
        this.isLoading = false; // Stop loading on error
        console.error('Error:', error);
      }
    );
  }

  onLogin(withPasskey: boolean = false) {
    if (!withPasskey && !this.username) {
      window.alert('Please enter a username.');
      return;
    }
    this.isLoading = true; // Start loading
    this.fidoService.generateAuthenticationOptions(this.username).subscribe(
      (response) => {
        // Handle the response and start WebAuthn Authentication
        this.startWebAuthnAuthentication(response);
      },
      (error) => {
        this.isLoading = false; // Stop loading on error
        console.error('Error:', error);
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
            this.isLoading = false;
            if (data.success) {
              window.alert('Registration Success');
              this.username = '';
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
        this.isLoading = false;
        console.error('WebAuthn Registration error:', error);
        if (error.name === 'NotAllowedError') {
          window.alert('Registration cancelled.');
        } else {
          window.alert('Error during registration. Please try again.');
        }
      });
  }

  private startWebAuthnAuthentication(response: any) {
    const { challenge, allowCredentials, timeout, rpID, userVerification } =
      response;
    response.challenge = this.base64ToBuffer(response.challenge);
    response.allowCredentials = response.allowCredentials.map((cred: any) => {
      if (typeof cred.id === 'string') {
        cred.id = this.base64ToBuffer(cred.id);
      }
      return cred;
    });

    navigator.credentials
      .get({ publicKey: response })
      .then((credential: Credential | null) => {
        if (!credential) {
          console.error('No credentials returned from WebAuthn API');
          window.Error('Error Authenticating, Please Try Again!');
          return;
        }
        const loggedInUser = this.username;
        const publicKeyCredential = credential as PublicKeyCredential;
        const assertionResponse =
          publicKeyCredential.response as AuthenticatorAssertionResponse;

        const authenticationData = {
          loggedInUser: loggedInUser,
          challenge: challenge,
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
          .subscribe({
            next: (data) => {
              this.isLoading = false;
              if (data.success) {
                window.alert(data.message || 'Authentication Success');
                this.username = '';
              } else {
                window.alert(data.message || 'Authentication Failed');
              }
            },
            error: (httpError) => {
              this.isLoading = false;
              console.error('HTTP Error:', httpError);
              let errorMessage =
                'Authentication process failed due to a network or server error.';
              if (
                httpError.error &&
                typeof httpError.error.message === 'string'
              ) {
                errorMessage = httpError.error.message;
              }
              window.alert(errorMessage);
            },
          });
      })
      .catch((error) => {
        this.isLoading = false;
        console.error('WebAuthn Authentication error:', error);
        if (error.name === 'NotAllowedError') {
          window.alert('Authentication cancelled.');
        } else {
          window.alert('Error during authentication. Please try again.');
        }
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
    return base64Url.replace(/-/g, '+').replace(/_/g, '/');
  }
}
