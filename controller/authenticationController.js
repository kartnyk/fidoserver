const mysql = require('mysql');
const simpleWebAuthnServer = require('@simplewebauthn/server');
const util = require('util');

const { generateAuthenticationOptions, verifyAuthenticationResponse } =
  simpleWebAuthnServer;

// Creating a connection pool
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: 'SQLaccount7!', // your password here
  database: 'fidodb',
});

// Promisify pool.query
pool.query = util.promisify(pool.query);

exports.generateAuthenticationOptions = async (req, res, next) => {
  const { username } = req.body;

  try {
    // Retrieve the user
    let [user] = await pool.query('SELECT * FROM Users WHERE Username = ?', [username]);
    if (!user) {
      return res
        .status(500)
        .json({ error: 'Invalid Username, User does not exist' });
    }
    
    // Retrieve user's authenticators
    let authenticators = await pool.query('SELECT * FROM Authenticators WHERE UserId = ?', [user.UserId]);
	
    const options = await generateAuthenticationOptions({
      allowCredentials: authenticators.map((authenticator) => (
		{
        id: authenticator.credentialID,
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

    res.json(options);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.verifyAuthenticationData = async (req, res, next) => {
  try {
    const authenticationData = req.body;
    const { loggedInUser, credential } = req.body;

    // Retrieve the user and challenge
    let [user] = await pool.query('SELECT * FROM Users WHERE Username = ?', [loggedInUser]);
    const savedChallenge = user.Challenge;
    const origin = 'http://localhost:4200';
    const rpID = 'localhost';

    // const base64CredentialID = Buffer.from(credential.id, 'base64').toString('base64');
	const base64CredentialID = credential.id;
    
    // Retrieve the authenticator linked with the credentialID
    let [matchingAuthenticator] = await pool.query(
      'SELECT * FROM Authenticators WHERE crdentialID = ?',
      [base64CredentialID]
    );

    if (!matchingAuthenticator) {
      throw new Error(`Could not find authenticator with credential ID: ${credential.id}`);
    }

    // Convert fields from strings back to Buffers
    // matchingAuthenticator.credentialPublicKey = Buffer.from(matchingAuthenticator.CredentialPublicKeyBlob, 'base64');
	matchingAuthenticator.credentialPublicKey = matchingAuthenticator.CredentialPublicKey;

    // Verify the attestation response
    const verification = await verifyAuthenticationResponse({
      credential,
      expectedChallenge: savedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: matchingAuthenticator,
    });

    if (!verification.verified) {
      throw new Error('Assertion response is not verified!');
    }

    // Update the counter in the Authenticator record
    const { newCounter } = verification.authenticationInfo;

    await pool.query(
      'UPDATE Authenticators SET Counter = ? WHERE crdentialID = ?',
      [newCounter, base64CredentialID]
    );

    res.status(200).send({
      success: true,
      message: 'Authentication and new counter update successful!',
    });
  } catch (error) {
    console.error('Authentication failed:', error);
    res.status(400).send({
      success: false,
      message: 'Authentication Failed!',
    });
  }
};
