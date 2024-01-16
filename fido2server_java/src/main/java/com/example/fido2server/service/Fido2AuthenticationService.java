package com.example.fido2server.service;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.fido2server.dto.AuthenticationResponseData;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.AssertionResult;
import com.yubico.webauthn.FinishAssertionOptions;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.AuthenticatorAssertionResponse;
import com.yubico.webauthn.data.ClientAssertionExtensionOutputs;
import com.yubico.webauthn.data.PublicKeyCredential;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import com.yubico.webauthn.StartAssertionOptions;
// ... other imports

@Service
public class Fido2AuthenticationService {

    private final RelyingParty relyingParty;
    @Autowired
    private final FidoDatabaseCredentialRepository fidoDbCredentialRepository;
    private final RelyingPartyIdentity rpIdentity;


    public Fido2AuthenticationService(FidoDatabaseCredentialRepository fidoDbCredentialRepository) {
        this.fidoDbCredentialRepository = fidoDbCredentialRepository;

        this.rpIdentity = RelyingPartyIdentity.builder()
                .id("localhost")  // Use your domain
                .name("FIDO2 Application")
                .build();

            this.relyingParty = RelyingParty.builder()
                .identity(rpIdentity)
                .credentialRepository(fidoDbCredentialRepository)
                .origins(Collections.singleton("http://localhost:4200"))
                .build();
    }
    
    public AssertionRequest startAuthentication(String username) {
        // Start the authentication process
        StartAssertionOptions startOptions = StartAssertionOptions.builder()
                .username(username)
                .timeout(60000)
                .build();

        AssertionRequest assertionRequest = relyingParty.startAssertion(startOptions);

        // Extract challenge, rpId, and allowCredentials from assertionRequest
        String challengeBase64 = assertionRequest.getPublicKeyCredentialRequestOptions().getChallenge().getBase64Url();
        String rpId = assertionRequest.getPublicKeyCredentialRequestOptions().getRpId();
        List<PublicKeyCredentialDescriptor> allowCredentials = assertionRequest.getPublicKeyCredentialRequestOptions().getAllowCredentials()
                .orElse(Collections.emptyList());

        // Update authentication options in the database
        fidoDbCredentialRepository.storeOriginalAuthenticationRequest(username, assertionRequest);

        return assertionRequest;
    }

    
    
    public Map<String, String> verifyAuthenticationResponse(AuthenticationResponseData authenticationData) throws Exception {
        String loggedInUser = authenticationData.getLoggedInUser();
        PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> credential = authenticationData.getCredential();
        System.out.println("Credential ID received: " + credential.getId().getBase64Url());
        
        if (!fidoDbCredentialRepository.doesCredentialExist(credential.getId())) {
            System.out.println("Credential ID not found in database: " + credential.getId().getBase64Url());
            throw new Exception("Credential ID not found in database");
        }
        System.out.println("Credential ID has been found in database: " + credential.getId().getBase64Url());
        try {
        	System.out.println("Logged In User is: " + loggedInUser);
            AssertionRequest originalRequest = fidoDbCredentialRepository.getOriginalAuthenticationRequest(loggedInUser);
        	System.out.println("originalRequest is: " + originalRequest);

            if (originalRequest == null) {
                throw new Exception("Original request not found for user: " + loggedInUser);
            }

            FinishAssertionOptions options = FinishAssertionOptions.builder()
                .request(originalRequest)
                .response(credential)
                .build();
            System.out.println("options is: " + options);

            AssertionResult result = relyingParty.finishAssertion(options);
            System.out.println("AssertionResult received");

            if (result != null && result.isSuccess()) {
                fidoDbCredentialRepository.updateSignatureCount(credential.getId(), result.getSignatureCount());
                System.out.println("Authentication successful for user: " + loggedInUser);

                Map<String, String> response = new HashMap<>();
                response.put("success", "true");
                response.put("message", "Authentication successful");
                return response;
            } else {
                System.out.println("Authentication failed for user: " + loggedInUser);
                throw new Exception("Authentication failed");
            }
        } catch (Exception e) {
            System.out.println("Exception during authentication: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}



