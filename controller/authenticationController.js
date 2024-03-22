const mongoose = require('mongoose');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const crypto = require('crypto');
const { use } = require('../routes/registrationRoute');

const { generateAuthenticationOptions, verifyAuthenticationResponse } =
	simpleWebAuthnServer;

// MongoDB connection
const dbURI = 'mongodb://localhost:27017/fidodb'; // replace with your MongoDB URI
mongoose
	.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => console.log('Connected to MongoDB'))
	.catch((err) => console.error('Could not connect to MongoDB', err));

// User schema and model
// Define the Credential schema
const credentialSchema = new mongoose.Schema({
	fmt: String,
	counter: Number,
	aaguid: String,
	credentialID: { type: Buffer, required: false },
	credentialPublicKey: { type: Buffer, required: false },
	credentialType: String,
	attestationObject: { type: Buffer, required: false },
	userVerified: Boolean,
	credentialDeviceType: String,
	credentialBackedUp: Boolean,
	origin: String,
	rpID: String,
	authenticatorExtensionResults: String, // or another appropriate type if not a string
	// Other fields that you may need to store for each credential
});

// Define the Authenticator schema
const authenticatorSchema = new mongoose.Schema({
	credentialID: { type: Buffer, required: false, index: true },
	credentialPublicKey: { type: Buffer, required: false },
	counter: { type: Number, required: false },
	credentialDeviceType: {
		type: String,
		enum: ['singleDevice', 'multiDevice'],
		required: false,
	},
	credentialBackedUp: { type: Boolean, required: false },
	// Store as an array of strings in MongoDB
	transports: [{ type: String, enum: ['usb', 'ble', 'nfc', 'internal'] }],
});

// Define the main User schema
const userSchema = new mongoose.Schema({
	username: String,
	userId: String,
	challenge: String,
	credential: credentialSchema,
	authenticators: [authenticatorSchema],
});

let User;
if (!mongoose.models.User) {
	console.log('Registration - Inside no schema');
	User = mongoose.model('User', userSchema);
} else {
	console.log('Registration - Inside present schema');
	User = mongoose.model('User');
}

exports.generateAuthenticationOptions = async (req, res, next) => {
	const { username } = req.body;

	try {
		// Retrieve the user
		if (username) {
			let user = await User.findOne({ username: username });
			if (!user) {
				// If user exists, send an error
				return res
					.status(500)
					.json({ error: 'Invalid Username, User does not exist' });
			}
			let userAuthenticators = user.authenticators;
			const options = await generateAuthenticationOptions({
				allowCredentials: userAuthenticators.map((authenticator) => ({
					id: authenticator.credentialID,
					type: 'public-key',
					// Optional
					// transports: authenticator.transports,
				})),
				userVerification: 'preferred',
			});

			// Save the challenge to the user's record
			user.challenge = options.challenge;
			await user.save();

			res.json(options);
		} else {
			console.log('No username');
			const options = await generateAuthenticationOptions({
				// This assumes generateAuthenticationOptions can handle calls without specifying allowCredentials
				allowCredentials: [],
				userVerification: 'preferred',
			});
			res.json(options);
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
};

// This query assumes the existence of a function or direct database access method
// that can execute MongoDB queries.

async function findUserAndAuthenticatorByCredentialID(credentialIDBase64) {
	let foundAuthenticator = null;
	let foundUser = null;

	const users = await User.find();

	for (let user of users) {
		const matchingAuthenticator = user.authenticators.find((authenticator) => {
			// Convert Binary type credentialID to base64 string for comparison
			const authenticatorCredentialIDBase64 =
				authenticator.credentialID.toString('base64');
			return authenticatorCredentialIDBase64 === credentialIDBase64;
		});

		if (matchingAuthenticator) {
			// If you only need the first match, you can return here
			// return { user, matchingAuthenticator };
			foundAuthenticator = matchingAuthenticator;
			foundUser = user;
			break; // Stop searching once a match is found
		}
	}

	return { foundUser, foundAuthenticator };
}

exports.verifyAuthenticationData = async (req, res, next) => {
	try {
		// Parse clientDataJSON and attestationObject
		const authenticationData = req.body;
		const { loggedInUser, credential, challenge } = req.body;

		//Retrieve the challenge
		const user = await User.findOne({ username: loggedInUser });
		const savedChallenge = user ? user.challenge : challenge;
		const origin = 'http://localhost:4200';
		const rpID = 'localhost';

		console.log('credential.id', credential.id);
		const base64CredentialID = Buffer.from(credential.id, 'base64').toString(
			'base64'
		); // Convert the credential.id to base64 format
		const { foundUser, foundAuthenticator } =
			await findUserAndAuthenticatorByCredentialID(base64CredentialID);
		console.log('foundUser', foundUser);
		console.log('foundAuthenticator', foundAuthenticator);
		if (!foundAuthenticator) {
			throw new Error(
				`Could not find authenticator, Credential not found`
			);
		} else {
			console.log('Just an info that authenticator was found');
		}
		// Verify the attestation response
		const verification = await verifyAuthenticationResponse({
			response: credential,
			expectedChallenge: savedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			authenticator: foundAuthenticator,
		});

		if (!verification.verified) {
			throw new Error('Assertion response is not verified!');
		}

		// Update the new counter
		const { authenticationInfo } = verification;
		const { newCounter } = authenticationInfo;
		username = foundUser.username;
		let matchedUser = await User.findOne({ username: username });
		if (!matchedUser.authenticator) {
			matchedUser.authenticator = {};
		}
		matchedUser.authenticator.counter = newCounter;

		// Save the updated user document
		await matchedUser.save();

		res.status(200).send({
			success: true,
			message: 'Authentication and new counter updation successful!',
		});
	} catch (error) {
		console.error('Authentication failed:', error);
		res.status(400).send({
			success: false,
			message: error.message,
		});
	}
};
