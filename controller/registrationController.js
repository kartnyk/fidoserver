const mongoose = require('mongoose');
const simpleWebAuthnServer = require('@simplewebauthn/server');

const {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
} = simpleWebAuthnServer;

console.log(simpleWebAuthnServer);

// MongoDB connection
const dbURI = 'mongodb://localhost:27017/fidodb'; // replace with your MongoDB URI
mongoose
    .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Could not connect to MongoDB', err));

// User schema and model
const userSchema = new mongoose.Schema({
    username: String,
    credential: {
        credentialId: { type: String, required: true, default: 'xxx' },
        publicKey: { type: String, required: true, default: 'xxx' },
        counter: { type: Number, required: true, default: 0 },
        // Other fields that you may need to store
    },
});

const User = mongoose.model('User', userSchema);

exports.generateRegistrationOptions = async (req, res, next) => {
	
	const { username } = req.body;
	console.log(username)

	try {
		// Check if the user already exists
		let user = await User.findOne({ username });
		if (user) {
			// If user exists, throw an error
			return res.status(400).json({ error: 'User already exists' });
		}

		// If user does not exist, create a new user (without credentials for now)
		user = new User({ username });
		await user.save();

		// Respond with a message indicating user was created
		// res.status(201).json({ message: 'User created', user });

		const options = await generateRegistrationOptions({
			rpName: 'FIDO Server',
			userId: user._id, // replaced with unique user ID from database
			userName: username,
			timeout: 60000,
			attestationType: 'direct',
			excludedCredentialIds: [], // in real-world applications, populate with previously registered credential IDs
		});
		console.log(options);
		res.json(options);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
};

exports.verifyRegistrationData = async(req, res, next) => {
	try {
		// Parse clientDataJSON and attestationObject
		const { clientDataJSON, attestationObject } = registrationData.response;
	
		const clientData = parseAttestationRequest(clientDataJSON);
		if (clientData.challenge !== originalChallenge) {
		  throw new Error("Challenge does not match!");
		}
	
		if (clientData.origin !== expectedOrigin) {
		  throw new Error("Origin does not match!");
		}
	
		// Verify the attestation response
		const verification = await verifyAttestationResponse({
		  credential: registrationData,
		  expectedChallenge: originalChallenge,
		  expectedOrigin,
		  // If you have a list of trusted authenticators, you can specify them here:
		  // trustedAttestationTypes: ['packed', 'tpm', ...],
		  // trustedDeviceAttestationCerts: [...],
		});
	
		if (!verification.verified) {
		  throw new Error("Attestation response is not verified!");
		}
	
		// Store the new credential data
		const { id, type, rawId, response } = registrationData;
		const { verified, authenticatorInfo } = verification;
	
		storeCredentialData({
		  credentialId: rawId,
		  publicKey: authenticatorInfo.publicKey,
		  // ... other metadata like counter value
		});
	
		return true;
	  } catch (error) {
		console.error("Verification failed:", error);
		return false;
	  }
};