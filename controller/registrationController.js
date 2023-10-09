const mongoose = require('mongoose');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const crypto = require('crypto');

const { generateRegistrationOptions, verifyRegistrationResponse } =
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

exports.generateRegistrationOptions = async (req, res, next) => {
	const { username } = req.body;

	try {
		// Check if the user already exists
		let user = await User.findOne({ username });
		let userAuthenticators = [];
		let userId;
		if (!user) {
			userId = crypto
				.createHash('sha256')
				.update(username)
				.digest('hex')
				.toString();
			console.log('userId => ', userId);

			user = new User({ username, userId });
			await user.save();
		}
		if (user) {
			userAuthenticators = user.authenticators;
			userId = user.userId
		}

		console.log("userAuthenticators", userAuthenticators);

		const options = await generateRegistrationOptions({
			rpName: 'FIDO Server',
			rpID: 'localhost',
			userID: userId, // use the generated unique ID
			userName: username,
			timeout: 60000,
			attestationType: 'direct',
			excludeCredentials: userAuthenticators.map((authenticator) => ({
				id: authenticator.credentialID,
				type: 'public-key',
				// Optional
				// transports: authenticator.transports,
			})),
		});
		console.log(options);

		// Save the challenge to the user's record
		user.challenge = options.challenge;
		await user.save();

		res.json(options);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
};

exports.verifyRegistrationData = async (req, res, next) => {
	try {
		// Parse clientDataJSON and attestationObject
		const registrationData = req.body;
		const { loggedInUser, credential } = req.body;
		console.log('Registration registrationData', registrationData);

		//Retrieve the challenge
		const user = await User.findOne({ userId: loggedInUser });
		const savedChallenge = user.challenge;
		const origin = 'http://localhost:4200';
		const rpID = 'localhost';
		console.log('user =>', user);
		console.log('savedChallenge =>', savedChallenge);

		// console.log(
		// 	'credential base64 ----------------------------------------- =>',
		// 	credential
		// );
		credential.rawId = credential.rawId;
		credential.response.clientDataJSON = credential.response.clientDataJSON;
		credential.response.attestationObject =
			credential.response.attestationObject;
		// console.log(
		// 	'credential array buffer -------------------------------------- =>',
		// 	credential
		// );

		// Verify the attestation response
		const verification = await verifyRegistrationResponse({
			response: credential,
			expectedChallenge: savedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
		});

		if (!verification.verified) {
			throw new Error('Attestation response is not verified!');
		}

		console.log('Verification success =>', verification);

		// Store the new credential data
		const registrationInfo = verification.registrationInfo;
		if (!user.credential) {
			console.log('Initializing User credential');
			user.credential = {};
		}
		// Convert Uint8Array values to Buffer
		user.credential.attestationObject = Buffer.from(
			registrationInfo.attestationObject
		);
		user.credential.credentialPublicKey = Buffer.from(
			registrationInfo.credentialPublicKey
		);
		user.credential.credentialID = Buffer.from(registrationInfo.credentialID);

		// Save other properties from registrationInfo
		user.credential.fmt = registrationInfo.fmt;
		user.credential.counter = registrationInfo.counter;
		user.credential.aaguid = registrationInfo.aaguid;
		user.credential.credentialType = registrationInfo.credentialType;
		user.credential.userVerified = registrationInfo.userVerified;
		user.credential.credentialDeviceType =
			registrationInfo.credentialDeviceType;
		user.credential.credentialBackedUp = registrationInfo.credentialBackedUp;
		user.credential.origin = registrationInfo.origin;
		user.credential.rpID = registrationInfo.rpID;
		user.credential.authenticatorExtensionResults =
			registrationInfo.authenticatorExtensionResults;
		// If there are other properties in registrationInfo that you want to save, add them similarly

		// user.authenticator.credentialID = Buffer.from(registrationInfo.credentialID);
		// user.authenticator.credentialPublicKey = Buffer.from(
		// 	registrationInfo.credentialPublicKey
		// );
		// user.authenticator.counter = registrationInfo.counter;

		// Save the updated user document
		const newAuthenticator = {
			//Bug - Authentication Verification
			credentialID: Buffer.from(registrationInfo.credentialID),
			credentialPublicKey: Buffer.from(registrationInfo.credentialPublicKey),
			counter: registrationInfo.counter,
			credentialDeviceType: registrationInfo.credentialDeviceType,
			credentialBackedUp: registrationInfo.credentialBackedUp,
			// Add other fields if necessary
		};
		user.authenticators.push(newAuthenticator);
		await user.save();

		// Push the new authenticator into the user's authenticators array
		// await User.findOneAndUpdate(
		// 	{ userId: loggedInUser },
		// 	{ $push: { authenticators: newAuthenticator } },
		// 	{ useFindAndModify: false }
		// );

		res.status(200).send({
			success: true,
			message: 'Verification and storage successful!',
		});
	} catch (error) {
		console.error('Verification failed:', error);
		res.status(500).send({
			success: false,
			message: 'Verification failed!',
		});
	}
};
