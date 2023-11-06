const mysql = require('mysql');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const util = require('util');

const { generateAuthenticationOptions } = simpleWebAuthnServer;

// AWS Lambda environment variables for database credentials
const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

// Creating a connection pool
const pool = mysql.createPool({
	connectionLimit: 10,
	host: host,
	user: user,
	password: password,
	database: database,
});

exports.handler = async (event) => {
	const { username } = JSON.parse(event.body);

	// Promisify pool.query
	pool.query = util.promisify(pool.query);

	try {
		// Retrieve the user
		let [user] = await pool.query('SELECT * FROM Users WHERE Username = ?', [
			username,
		]);
		if (!user) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: 'Invalid Username, User does not exist',
				}),
				headers: { 'Content-Type': 'application/json' },
			};
		}

		// Retrieve user's authenticators
		let authenticators = await pool.query(
			'SELECT * FROM Authenticators WHERE UserId = ?',
			[user.UserId]
		);

		const options = await generateAuthenticationOptions({
			allowCredentials: authenticators.map((authenticator) => ({
				id: Buffer.from(authenticator.credentialID).toString('base64'),
				type: 'public-key',
				// Optional
				// transports: JSON.parse(authenticator.Transports), // Assuming transports is stored as JSON string
			})),
			userVerification: 'preferred',
		});

		// Save the challenge to the user's record
		await pool.query('UPDATE Users SET Challenge = ? WHERE UserId = ?', [
			options.challenge,
			user.UserId,
		]);

		return {
			statusCode: 200,
			body: JSON.stringify(options),
			headers: { 'Content-Type': 'application/json' },
		};
	} catch (error) {
		console.error(error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal Server Error' }),
			headers: { 'Content-Type': 'application/json' },
		};
	}
};
