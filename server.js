const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const registrationRoutes = require('./routes/registrationRoute')
const authenticationRoutes = require('./routes/authenticationRoute')


const {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
} = simpleWebAuthnServer;

// console.log(simpleWebAuthnServer);

const app = express();
app.use(bodyParser.json());
app.use(cors());


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'),
    res.setHeader('Access-Control-Allow-Methods', '*'),
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
})

// API routes
app.use('/fido/register', registrationRoutes)
app.use('/fido/authenticate', authenticationRoutes)

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
