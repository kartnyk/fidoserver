const mysql = require('mysql');

exports.handler = async (event) => {
    // Retrieve database credentials from environment variables
    const auroraHost = process.env.AURORA_HOST;
    const auroraUser = process.env.AURORA_USER;
    const auroraPassword = process.env.AURORA_PASSWORD;
    const auroraDatabase = process.env.AURORA_DATABASE;

    // Create a MySQL connection
    const connection = mysql.createConnection({
        host: auroraHost,
        user: auroraUser,
        password: auroraPassword,
        database: auroraDatabase,
    });

    try {
        // Connect to the Aurora database
        connection.connect((error) => {
            if (error) {
                console.error('Failed to connect to Amazon Aurora:', error);
                // You can return an error response here if needed
            } else {
                console.log('Connected to Amazon Aurora!');
                // The connection is established, you can proceed with further operations
                // For example, you can execute database queries here
            }
            // Close the database connection
            connection.end();
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Connection test completed' }),
        };
    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
