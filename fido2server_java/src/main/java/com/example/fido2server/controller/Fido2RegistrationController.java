package com.example.fido2server.controller;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.fido2server.dto.RegistrationResponseData;
import com.example.fido2server.service.Fido2RegistrationService;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
// ... other imports

@RestController
@RequestMapping("/fido")
public class Fido2RegistrationController {

    private final Fido2RegistrationService fido2Service;

    public Fido2RegistrationController(Fido2RegistrationService fido2Service) {
        this.fido2Service = fido2Service;
    }

    @GetMapping("/register/generateRegistrationOptions")
    public ResponseEntity<PublicKeyCredentialCreationOptions> startRegistration(@RequestParam(name = "username") String username) {
        try {
            PublicKeyCredentialCreationOptions registrationOptions = fido2Service.startRegistration(username);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(registrationOptions);
        } catch (Exception e) {
            // Handle exceptions
        	 e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/register/verifyRegistrationResponse")
    public ResponseEntity<?> verifyRegistrationResponse(@RequestBody RegistrationResponseData registrationData) {
        try {
            Map<String, String> response = fido2Service.verifyRegistrationResponse(registrationData);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("Error verifying registration: " + e.getMessage());
        }
    }
}
