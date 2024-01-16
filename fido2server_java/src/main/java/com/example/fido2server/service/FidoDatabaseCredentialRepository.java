package com.example.fido2server.service;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;


import com.google.gson.Gson;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.CredentialRepository;

import com.yubico.webauthn.data.ByteArray;

import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import com.yubico.webauthn.data.PublicKeyCredentialRequestOptions;
import com.yubico.webauthn.data.PublicKeyCredentialType;
import com.yubico.webauthn.data.UserIdentity;
import com.yubico.webauthn.RegisteredCredential;

import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Repository
public class FidoDatabaseCredentialRepository implements CredentialRepository {

	private final JdbcTemplate jdbcTemplate;

	public FidoDatabaseCredentialRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

//	public Optional<UserIdentity> findExistingUser(String username) {
//		try {
//			// Fetch user data from the Users table
//			String query = "SELECT UserId, Username FROM Users WHERE Username = ?";
//			Map<String, Object> userData = jdbcTemplate.queryForMap(query, username);
//
//			// Extract data from the result
//			ByteArray userId = new ByteArray(userData.get("UserId").toString().getBytes());
//			String name = userData.get("Username").toString();
//
//			// Create a UserIdentity object
//			UserIdentity userIdentity = UserIdentity.builder()
//					.name(name)
//					.displayName(name) // Assuming the display name is the same as the username
//					.id(userId)
//					.build();
//
//			return Optional.of(userIdentity);
//		} catch (EmptyResultDataAccessException e) {
//			// User not found in the database
//			return Optional.empty();
//		}
//	}
	
	public Optional<UserIdentity> findExistingUser(String username) {
	    try {
	        // Fetch user data from the database
	        String query = "SELECT UserId, Username FROM Users WHERE Username = ?";
	        Map<String, Object> userData = jdbcTemplate.queryForMap(query, username);

	        // Extract userId and username from the result
	        String userIdBase64 = (String) userData.get("UserId");
	        String name = (String) userData.get("Username");

	        // Decode the Base64 userId to a ByteArray
	        ByteArray userId = new ByteArray(Base64.getDecoder().decode(userIdBase64));

	        // Create a UserIdentity object
	        UserIdentity userIdentity = UserIdentity.builder()
	                .name(name)
	                .displayName("Display Name for " + name) // You can adjust the display name logic as needed
	                .id(userId)
	                .build();

	        return Optional.of(userIdentity);
	    } catch (EmptyResultDataAccessException e) {
	        // User not found in the database
	        return Optional.empty();
	    }
	}





	public void saveNewUser(UserIdentity userIdentity) {
		// Convert ByteArray to Base64 string
		String userIdBase64 = toBase64String(userIdentity.getId());

		// Use the converted string in your SQL query
		String sql = "INSERT INTO Users (Username, UserId, Challenge) VALUES (?, ?, ?)";
		jdbcTemplate.update(sql, userIdentity.getName(), userIdBase64, "your_challenge_here");
	}


//	@SuppressWarnings("deprecation")
//	@Override
//	public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
//		return new HashSet<>(jdbcTemplate.query(
//				"SELECT credentialID FROM Authenticators WHERE UserId = (SELECT UserId FROM Users WHERE Username = ?)",
//				new Object[]{username},
//				(rs, rowNum) -> PublicKeyCredentialDescriptor.builder()
//				.id(new ByteArray(rs.getBytes("credentialID")))
//				.type(PublicKeyCredentialType.PUBLIC_KEY)
//				.build()
//				));
//	}
	
	@SuppressWarnings("deprecation")
	@Override
	public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
	    return new HashSet<>(jdbcTemplate.query(
	        "SELECT UserCredentialId FROM WebAuthnCredentials WHERE UserId = (SELECT UserId FROM Users WHERE Username = ?)",
	        new Object[]{username},
	        (rs, rowNum) -> PublicKeyCredentialDescriptor.builder()
	            .id(new ByteArray(rs.getBytes("UserCredentialId")))
	            .type(PublicKeyCredentialType.PUBLIC_KEY)
	            .build()
	    ));
	}


	public void updateChallengeForUser(String username, String challenge) {
		// Update the challenge for the user in the database
		jdbcTemplate.update("UPDATE Users SET Challenge = ? WHERE Username = ?", challenge, username);
	}

	public void updateRegOptions(String rpName, String rpId, String userDisplayName, String pubKeyCredParamsJson, String username) {
		// Update the challenge for the user in the database
		jdbcTemplate.update("UPDATE Users SET RpName = ?, RpId = ?, UserDisplayName = ?, PublicKeyCredParams = ? WHERE Username = ?",
				rpName, rpId, userDisplayName, pubKeyCredParamsJson, username);
	}
	
	public void storeOriginalAuthenticationRequest(String username, AssertionRequest assertionRequest) {
	    Gson gson = new Gson();
	    String assertionRequestJson = gson.toJson(assertionRequest);

	    jdbcTemplate.update("UPDATE Users SET OriginalAuthRequest = ? WHERE Username = ?", 
	                        assertionRequestJson, username);
	}



	public PublicKeyCredentialCreationOptions getOriginalRegistrationOptions(String userId) {
		try {
			Map<String, Object> userData = jdbcTemplate.queryForMap(
					"SELECT PublicKeyCredParams FROM Users WHERE UserId = ?",
					userId
					);

			if (userData != null && userData.containsKey("PublicKeyCredParams")) {
				String publicKeyCredParamsJson = (String) userData.get("PublicKeyCredParams");
				Gson gson = new Gson();
				return gson.fromJson(publicKeyCredParamsJson, PublicKeyCredentialCreationOptions.class);
			} else {
				// Handle the case where PublicKeyCredParams is not found or is null
				return null;
			}
		} catch (EmptyResultDataAccessException e) {
			// No user found with the given userId
			return null;
		}
	}

	@SuppressWarnings("deprecation")
	public AssertionRequest getOriginalAuthenticationRequest(String username) {
	    try {
	        String json = jdbcTemplate.queryForObject("SELECT OriginalAuthRequest FROM Users WHERE Username = ?", 
	                                                  new Object[] {username}, String.class);
	        Gson gson = new Gson();
	        return gson.fromJson(json, AssertionRequest.class);
	    } catch (EmptyResultDataAccessException e) {
	        return null;
	    }
	}

	
	public void storeCredential(
		    String loggedInUser,
		    ByteArray keyId, // keyId is already a ByteArray
		    ByteArray publicKeyCose,
		    int signatureCount,
		    boolean isDiscoverable,
		    boolean isBackupEligible,
		    boolean isBackedUp,
		    ByteArray attestationObject,
		    ByteArray clientDataJSON
		) {
		    String sql = "INSERT INTO WebAuthnCredentials (UserId, UserCredentialId, PublicKeyCose, SignatureCount, Discoverable, BackupEligible, BackedUp, AttestationObject, ClientDataJSON) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

		    jdbcTemplate.update(
		        sql,
		        loggedInUser,
		        keyId.getBytes(), // save as byte array
		        publicKeyCose.getBytes(),
		        signatureCount,
		        isDiscoverable,
		        isBackupEligible,
		        isBackedUp,
		        attestationObject.getBytes(),
		        clientDataJSON.getBytes()
		    );
		}



	@SuppressWarnings("deprecation")
	@Override
	public Optional<ByteArray> getUserHandleForUsername(String username) {
	    return jdbcTemplate.queryForObject("SELECT UserId FROM Users WHERE Username = ?",
	            new Object[]{username},
	            (rs, rowNum) -> {
	                String userIdBase64 = rs.getString("UserId");
	                return Optional.of(new ByteArray(Base64.getDecoder().decode(userIdBase64)));
	            });
	}


	@SuppressWarnings("deprecation")
	@Override
	public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
		return jdbcTemplate.queryForObject("SELECT Username FROM Users WHERE UserId = ?",
				new Object[]{userHandle.getBytes()},
				(rs, rowNum) -> Optional.of(rs.getString("Username"))
				);
	}

	@SuppressWarnings("deprecation")
	@Override
	public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
	    try {
	    	System.out.println("credentialId inside lookup is: " + credentialId);
	    	System.out.println("userHandle inside lookup is: " + userHandle);
	        return jdbcTemplate.queryForObject(
//	            "SELECT * FROM WebAuthnCredentials WHERE UserCredentialId = ? AND UserId = ?",
//	            new Object[] { credentialId.getBytes(), userHandle.getBytes() },
	        		"SELECT * FROM WebAuthnCredentials WHERE UserCredentialId = ?",
	    	        new Object[] { credentialId.getBytes() },
	            (rs, rowNum) -> Optional.of(RegisteredCredential.builder()
	                .credentialId(credentialId)
	                .userHandle(userHandle)
	                .publicKeyCose(new ByteArray(rs.getBytes("PublicKeyCose")))
	                .signatureCount(rs.getLong("SignatureCount"))
	                .build())
	        );
	    } catch (EmptyResultDataAccessException e) {
	        return Optional.empty();
	    }
	}

	@SuppressWarnings("deprecation")
	@Override
	public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
	    return new HashSet<>(jdbcTemplate.query(
	        "SELECT * FROM WebAuthnCredentials WHERE UserCredentialId = ?",
	        new Object[] { credentialId.getBytes() },
	        (rs, rowNum) -> RegisteredCredential.builder()
	            .credentialId(credentialId)
	            .userHandle(new ByteArray(rs.getBytes("UserId")))
	            .publicKeyCose(new ByteArray(rs.getBytes("PublicKeyCose")))
	            .signatureCount(rs.getLong("SignatureCount"))
	            .build()
	    ));
	}


	@SuppressWarnings("deprecation")
	public Optional<String> findUserIdByUsername(String username) {
		try {
			String userId = jdbcTemplate.queryForObject(
					"SELECT UserId FROM Users WHERE Username = ?", 
					new Object[]{username}, 
					(rs, rowNum) -> rs.getString("UserId")
					);
			return Optional.ofNullable(userId);
		} catch (EmptyResultDataAccessException e) {
			return Optional.empty(); // User not found
		}
	}

	private String toBase64String(ByteArray byteArray) {
		return Base64.getEncoder().encodeToString(byteArray.getBytes());
	}
	
	public void updateSignatureCount(ByteArray credentialId, long newSignatureCount) {
	    String sql = "UPDATE WebAuthnCredentials SET SignatureCount = ? WHERE UserCredentialId = ?";
	    jdbcTemplate.update(sql, newSignatureCount, credentialId.getBytes());
	}
	
	public boolean doesCredentialExist(ByteArray credentialId) {
	    String sql = "SELECT COUNT(*) FROM WebAuthnCredentials WHERE UserCredentialId = ?";
	    int count = jdbcTemplate.queryForObject(sql, new Object[]{credentialId.getBytes()}, Integer.class);
	    return count > 0;
	}

	// Additional methods for user and credential management
}
