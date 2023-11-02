const mysql = require('mysql');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const crypto = require('crypto');
const util = require('util');

const { generateRegistrationOptions, verifyRegistrationResponse } =
	simpleWebAuthnServer;

// Creating a connection pool
const pool = mysql.createPool({
	connectionLimit: 10,
	host: 'localhost',
	user: 'root',
	password: 'SQLaccount7!', // your password here
	database: 'fidodb',
});

exports.generateRegistrationOptions = async (req, res, next) => {
	const { username } = req.body;

	pool.query = util.promisify(pool.query);

	try {
		let results = await pool.query('SELECT * FROM Users WHERE Username = ?', [
			username,
		]);

		let userId;
		let excludeCredentials = [];
		if (results.length === 0) {
			userId = crypto
				.createHash('sha256')
				.update(username)
				.digest('hex')
				.toString();
			await pool.query(
				'INSERT INTO Users (Username, UserId, Challenge) VALUES (?, ?, ?)',
				[username, userId, null]
			);
		} else {
			userId = results[0].UserId;
			const existingAuthenticators = await pool.query(
				'SELECT credentialID FROM Authenticators WHERE UserId = ?',
				userId
			);
			excludeCredentials = existingAuthenticators.map(auth => ({
				type: 'public-key',
				id: auth.credentialID, // Make sure to convert Buffer to the right format if needed
			}));
		}

		const options = await generateRegistrationOptions({
			rpName: 'FIDO Server',
			rpID: 'localhost',
			userID: userId,
			userName: username,
			timeout: 60000,
			attestationType: 'direct',
			excludeCredentials: excludeCredentials,
		});

		await pool.query('UPDATE Users SET Challenge = ? WHERE UserId = ?', [
			options.challenge,
			userId,
		]);

		res.json(options);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
};

exports.verifyRegistrationData = async (req, res, next) => {
	try {
		const registrationData = req.body;
		const { loggedInUser, credential } = registrationData;

		const userResults = await pool.query(
			'SELECT * FROM Users WHERE UserId = ?',
			[loggedInUser]
		);
		const user = userResults[0];
		const savedChallenge = user.Challenge;
		const origin = 'http://localhost:4200';
		const rpID = 'localhost';

		const verification = await verifyRegistrationResponse({
			response: credential,
			expectedChallenge: savedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
		});

		if (!verification.verified) {
			return res
				.status(400)
				.json({ error: 'Attestation response is not verified!' });
		}

		const registrationInfo = verification.registrationInfo;
		const newAuthenticator = {
			credentialID: Buffer.from(registrationInfo.credentialID),
			credentialPublicKey:
				Buffer.from(registrationInfo.credentialPublicKey),
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
				newAuthenticator.counter
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

		res.status(200).send({
			success: true,
			message: 'Verification and storage successful!',
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Internal Server Error' });
	}
};
