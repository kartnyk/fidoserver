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

import com.example.fido2server.dto.AuthenticationResponseData;
import com.example.fido2server.service.Fido2AuthenticationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.yubico.webauthn.AssertionRequest;
// ... other imports

@RestController
@RequestMapping("/fido")
public class Fido2AuthenticationController {

    private final Fido2AuthenticationService fido2AuthService;

    public Fido2AuthenticationController(Fido2AuthenticationService fido2AuthService) {
        this.fido2AuthService = fido2AuthService;
    }

    @GetMapping("/authenticate/generateAuthenticationOptions")
    public ResponseEntity<?> startAuthentication(@RequestParam(name = "username") String username) {
        try {
            AssertionRequest assertionRequest = fido2AuthService.startAuthentication(username);
//            System.out.println("AssertionRequest: " + assertionRequest);
            // Convert AssertionRequest to JSON, similar to how you did	 in registration
            String jsonResponse = convertAssertionRequestToJson(assertionRequest);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(jsonResponse);
        } catch (Exception e) {
            e.printStackTrace();  // Log the stack trace
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    

    // Method to convert AssertionRequest to JSON
    private String convertAssertionRequestToJson(AssertionRequest assertionRequest) {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new Jdk8Module()); // Register the JDK 8 module

        try {
            return objectMapper.writeValueAsString(assertionRequest);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return "Error converting to JSON: " + e.getMessage();
        }
    }
    
    @PostMapping("/authenticate/verifyAuthenticationData")
    public ResponseEntity<?> verifyAuthenticationData(@RequestBody AuthenticationResponseData authenticationData) {
        try {
            Map<String, String> response = fido2AuthService.verifyAuthenticationResponse(authenticationData);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);
        } catch (Exception e) {
            // Handle exceptions
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error verifying authentication: " + e.getMessage());
        }
    }


    // Other authentication-related endpoints
}
