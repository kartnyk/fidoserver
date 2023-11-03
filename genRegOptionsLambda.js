const mysql = require('mysql');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const crypto = require('crypto');
const util = require('util');

const { generateRegistrationOptions } = simpleWebAuthnServer;

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
			excludeCredentials = existingAuthenticators.map((auth) => ({
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
		return {
			statusCode: 200,
			body: JSON.stringify(options),
			headers: {
				'Content-Type': 'application/json',
			},
		};
	} catch (err) {
		console.error(err);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal Server Error' }),
		};
	}
};
