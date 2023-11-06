const mysql = require('mysql');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const util = require('util');
const { verifyRegistrationResponse } = simpleWebAuthnServer;

// AWS Lambda environment variables for database credentials
const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

// Create a connection pool
const pool = mysql.createPool({
	connectionLimit: 10,
	host: host,
	user: user,
	password: password,
	database: database,
});

// Promisify pool.query
pool.query = util.promisify(pool.query);

exports.handler = async (event) => {
	try {
		const registrationData = JSON.parse(event.body);
		const { loggedInUser, credential } = registrationData;

		const userResults = await pool.query(
			'SELECT * FROM Users WHERE UserId = ?',
			[loggedInUser]
		);
		const user = userResults[0];
		const savedChallenge = user.Challenge;
		const origin = 'http://localhost:4200'; // This should be the actual origin of your application
		const rpID = 'localhost'; // This should be the actual relying party identifier

		const verification = await verifyRegistrationResponse({
			response: credential,
			expectedChallenge: savedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
		});

		if (!verification.verified) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: 'Attestation response is not verified!',
				}),
				headers: { 'Content-Type': 'application/json' },
			};
		}

		const registrationInfo = verification.registrationInfo;

		// Insert new authenticator data into the database, etc...
		const newAuthenticator = {
			credentialID: Buffer.from(registrationInfo.credentialID),
			credentialPublicKey: Buffer.from(registrationInfo.credentialPublicKey),
			counter: registrationInfo.counter,
			credentialDeviceType: registrationInfo.credentialDeviceType,
			credentialBackedUp: registrationInfo.credentialBackedUp,
		};

		const authenticatorResults = await pool.query(
			'INSERT INTO Authenticators (UserId, CredentialDeviceType, CredentialBackedUp, credentialID, credentialPublicKey, counter) VALUES (?, ?, ?, ?, ?, ?)',
			[
				loggedInUser,
				newAuthenticator.credentialDeviceType,
				newAuthenticator.credentialBackedUp,
				newAuthenticator.credentialID,
				newAuthenticator.credentialPublicKey,
				newAuthenticator.counter,
			]
		);

		const authenticatorId = authenticatorResults.insertId;

		await pool.query(
			'INSERT INTO Credentials (AuthenticatorId, Fmt, Counter, Aaguid, CredentialIDBlob, CredentialPublicKeyBlob, CredentialType, AttestationObjectBlob, UserVerified, Origin, RpID, AuthenticatorExtensionResults) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				authenticatorId,
				registrationInfo.fmt,
				registrationInfo.counter,
				registrationInfo.aaguid,
				JSON.stringify(registrationInfo.credentialID),
				JSON.stringify(registrationInfo.credentialPublicKey),
				registrationInfo.credentialType,
				JSON.stringify(registrationInfo.attestationObject),
				registrationInfo.userVerified,
				registrationInfo.origin,
				registrationInfo.rpID,
				registrationInfo.authenticatorExtensionResults,
			]
		);

		// After successful storage
		return {
			statusCode: 200,
			body: JSON.stringify({
				success: true,
				message: 'Verification and storage successful!',
			}),
			headers: { 'Content-Type': 'application/json' },
		};
	} catch (err) {
		console.error(err);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal Server Error' }),
			headers: { 'Content-Type': 'application/json' },
		};
	}
};
