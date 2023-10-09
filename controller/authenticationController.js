const mongoose = require('mongoose');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const crypto = require('crypto');

const {
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
} = simpleWebAuthnServer;

// MongoDB connection
const dbURI = 'mongodb://localhost:27017/fidodb'; // replace with your MongoDB URI
mongoose
	.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => console.log('Connected to MongoDB'))
	.catch((err) => console.error('Could not connect to MongoDB', err));

// User schema and model
const userSchema = new mongoose.Schema({
	username: String,
	userId: String,
	challenge: String,
	credential: {
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
	},
});

let User;
if (mongoose.models == null || !mongoose.models.User) {
	console.log("Authentication - Inside no schema")
	User = mongoose.model('User', userSchema);
} else {
	console.log("Authentication - Inside present schema")
	User = mongoose.model('User');
}

exports.generateAuthenticationOptions = async (req, res, next) => {
    const { username } = req.body;

    try {
		// Retrieve the user
		let user = await User.findOne({ username: username });
        // console.log("Auth Username", user)
		if (!user) {
			// If user exists, throw an error
			return res.status(400).json({ error: 'Invalid Username, User does not exist' });
		}

        const options = await generateAuthenticationOptions({
            allowCredentials: [],
            userVerification: 'preferred',
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
}

exports.verifyAuthenticationData = async (req, res, next) => {
	try {
		// Parse clientDataJSON and attestationObject
		const authenticationData = req.body;
		const { loggedInUser, credential } = req.body;

		//Retrieve the challenge
		// console.log("authentication loggedInUser", authenticationData)
		const user = await User.findOne({ username: loggedInUser });
		// console.log("verify authenticator data, User", user)
		const savedChallenge = user.challenge;
		const origin = 'http://localhost:4200';
		const rpID = 'localhost';
		const authenticator = user.authenticator;
		// console.log('user =>', user);
		console.log('savedChallenge =>', savedChallenge);

		console.log(
			'authentication credential base64 ----------------------------------------- =>',
			credential
		);
		// credential.rawId = credential.rawId;
		// credential.response.clientDataJSON = credential.response.clientDataJSON;
		// credential.response.attestationObject =
		// 	credential.response.attestationObject;
		// console.log(
		// 	'credential array buffer -------------------------------------- =>',
		// 	credential
		// );

		// Verify the attestation response
		const verification = await verifyAuthenticationResponse({
			response: credential,
			expectedChallenge: savedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			authenticator: authenticator
		});

		console.log("Authentication verification", verification)
		if (!verification.verified) {
			throw new Error('Assertion response is not verified!');
		}

		console.log('Verification success =>', verification);

		// Update the new counter
		const { authenticationInfo } = verification;
		const { newCounter } = authenticationInfo;

		user.authenticator.counter = newCounter;

		// Save the updated user document
		await user.save();

		// storeCredentialData({
		// 	credentialId: rawId,
		// 	publicKey: authenticatorInfo.publicKey,
		// 	// ... other metadata like counter value
		// });

		res.status(200).send({ 
			success: true,
			message: 'Authentication and new counter updation successful!' });
	} catch (error) {
		console.error('Authentication failed:', error);
		res.status(400).send(
			{
				success: false,
				message: 'Authentication Failed!'
			}
		)
	}
};
