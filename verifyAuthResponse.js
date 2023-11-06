const mysql = require('mysql');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const util = require('util');
const { verifyAuthenticationResponse } = simpleWebAuthnServer;

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
    const authenticationData = JSON.parse(event.body);
    const { loggedInUser, credential } = authenticationData;

    let [user] = await pool.query('SELECT * FROM Users WHERE Username = ?', [loggedInUser]);
    const savedChallenge = user.Challenge;
    const origin = 'http://localhost:4200'; // Should be set to the actual origin
    const rpID = 'localhost'; // Should be set to the actual RP ID

    const base64CredentialID = credential.id;
    const credentialIDBuffer = Buffer.from(base64CredentialID, 'base64');

    let matchingAuthenticator = await pool.query(
      'SELECT * FROM Authenticators WHERE credentialID = ?',
      [credentialIDBuffer]
    );

    if (matchingAuthenticator.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: `Could not find authenticator with credential ID: ${base64CredentialID}`
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: savedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: matchingAuthenticator[0],
    });

    if (!verification.verified) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Assertion response is not verified!'
        }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    const { newCounter } = verification.authenticationInfo;

    await pool.query(
      'UPDATE Authenticators SET Counter = ? WHERE credentialID = ?',
      [newCounter, credentialIDBuffer]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Authentication and new counter update successful!',
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error('Authentication failed:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: 'Authentication Failed!',
        error: error.message
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
