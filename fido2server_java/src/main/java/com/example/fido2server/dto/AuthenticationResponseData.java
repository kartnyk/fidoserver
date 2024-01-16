package com.example.fido2server.dto;

import com.yubico.webauthn.data.AuthenticatorAssertionResponse;
import com.yubico.webauthn.data.ClientAssertionExtensionOutputs;
import com.yubico.webauthn.data.PublicKeyCredential;

public class AuthenticationResponseData {
    private String loggedInUser;
    private PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> credential;

    // Constructors
    public AuthenticationResponseData() {
    }

    // Getters and setters
    public String getLoggedInUser() {
        return loggedInUser;
    }

    public void setLoggedInUser(String loggedInUser) {
        this.loggedInUser = loggedInUser;
    }

    public PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> getCredential() {
        return credential;
    }

    public void setCredential(PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> credential) {
        this.credential = credential;
    }

    // toString method for debugging
    @Override
    public String toString() {
        return "AuthenticationResponseData{" +
               "loggedInUser='" + loggedInUser + '\'' +
               ", credential=" + credential +
               '}';
    }
}
