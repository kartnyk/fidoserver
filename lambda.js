const mysql = require('mysql2/promise');

exports.handler = async (event) => {
    // Configure database connection
    const connection = await mysql.createConnection({
        host: 'your-aurora-cluster-endpoint',
        user: 'your-username',
        password: 'your-password',
        database: 'fdb'
    });

    try {
        // Construct the SQL query with hardcoded values
        const query = "UPDATE User SET UserName = 'NewName', UserEmail = 'newemail@example.com' WHERE UserID = 1";

        // Execute the query
        const [result] = await connection.execute(query);

        // Close the connection
        await connection.end();

        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error(error);
        await connection.end();
        return {
            statusCode: 500,
            body: JSON.stringify(error)
        };
    }
};
