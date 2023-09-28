const express = require('express');
const bodyParser = require('body-parser');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const registrationRoutes = require('./routes/registrationRoute')


const {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
} = simpleWebAuthnServer;

// console.log(simpleWebAuthnServer);

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'),
    res.setHeader('Access-Control-Allow-Methods', '*'),
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
})

// API routes
// app.post('/register/options', async (req, res) => {
// 	const { username } = req.body;

// 	try {
// 		// Check if the user already exists
// 		let user = await User.findOne({ username });
// 		if (user) {
// 			// If user exists, throw an error
// 			return res.status(400).json({ error: 'User already exists' });
// 		}

// 		// If user does not exist, create a new user (without credentials for now)
// 		user = new User({ username });
// 		await user.save();

// 		// Respond with a message indicating user was created
// 		// res.status(201).json({ message: 'User created', user });

// 		const options = await generateRegistrationOptions({
// 			rpName: 'FIDO Server',
// 			userId: user._id, // replaced with unique user ID from database
// 			userName: username,
// 			timeout: 60000,
// 			attestationType: 'direct',
// 			excludedCredentialIds: [], // in real-world applications, populate with previously registered credential IDs
// 		});
// 		console.log(options);
// 		res.json(options);
// 	} catch (error) {
// 		console.error(error);
// 		res.status(500).json({ error: 'Internal Server Error' });
// 	}
// });

// app.post('/register/verify', async (req, res) => {
// 	const { body } = req;

// 	try {
// 		const verification = await verifyRegistrationResponse(body);

// 		if (verification.verified) {
// 			// Get the username and credentials from the verification response (adjust as necessary)
// 			const { username, credentials } = verification;

// 			// Find the user in the database by username
// 			let user = await User.findOne({ username });

// 			if (user) {
// 				// If user exists, update their credentials in the database
// 				user.credential = credentials;
// 				await user.save();

// 				res.json({ verified: true });
// 			} else {
// 				// If user does not exist, respond with an error message
// 				res.status(400).json({ error: 'User not found' });
// 			}
// 		} else {
// 			res.json({ verified: false });
// 		}
// 	} catch (error) {
// 		console.error(error);
// 		res.status(400).send('Verification failed');
// 	}
// });

// app.post('/login/options', async (req, res) => {
// 	const { username } = req.body;

// 	// Here, retrieve the user's information and credentials from the database using the username

// 	const options = generateAuthenticationOptions({
// 		timeout: 60000,
// 		allowCredentials: [], // populate with the user's saved credentials from the database
// 	});

// 	res.json(options);
// });

// app.post('/login/verify', async (req, res) => {
// 	const { body } = req;

// 	// Here, retrieve the user's information and credentials from the database using the username in the body

// 	try {
// 		const verification = await verifyAuthenticationResponse(body);

// 		if (verification.verified) {
// 			res.json({ verified: true });
// 		} else {
// 			res.json({ verified: false });
// 		}
// 	} catch (error) {
// 		console.error(error);
// 		res.status(400).send('Verification failed');
// 	}
// });

app.use('/fido/register', registrationRoutes)

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
