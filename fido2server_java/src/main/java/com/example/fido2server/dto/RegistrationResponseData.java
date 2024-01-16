package com.example.fido2server.dto;

import com.yubico.webauthn.data.AuthenticatorAttestationResponse;
import com.yubico.webauthn.data.ClientRegistrationExtensionOutputs;
import com.yubico.webauthn.data.PublicKeyCredential;

public class RegistrationResponseData {
    private String loggedInUser;
    private PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> credential;

    // Constructor, getters and setters
    public RegistrationResponseData() {
    }

    public String getLoggedInUser() {
        return loggedInUser;
    }

    public void setLoggedInUser(String loggedInUser) {
        this.loggedInUser = loggedInUser;
    }

    public PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> getCredential() {
        return credential;
    }

    public void setCredential(PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> credential) {
        this.credential = credential;
    }
    
    @Override
    public String toString() {
        return "RegistrationResponseData{" +
               "loggedInUser='" + loggedInUser + '\'' +
               ", credential=" + credential +
               '}';
    }
}

