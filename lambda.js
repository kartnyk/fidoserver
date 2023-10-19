const AWS = require('aws-sdk');
const rds = new AWS.RDSDataService({ region: 'us-east-1' }); // Replace 'us-east-1' with your AWS region

exports.handler = async (event) => {
    // Replace these with your actual Aurora MySQL database credentials and connection details
    const dbClusterArn = 'arn:aws:rds:us-east-1:123456789012:cluster:your-cluster-name';
    const dbName = 'your-database-name';
    const dbSecretArn = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:your-secret-name';
    const sqlStatement = 'SELECT * FROM your_table_name'; // Replace with your SQL query

    try {
        const params = {
            awsSecretStoreArn: dbSecretArn,
            dbClusterOrInstanceArn: dbClusterArn,
            sqlStatements: sqlStatement,
            database: dbName,
            includeResultMetadata: true
        };

        const data = await rds.executeStatement(params).promise();

        console.log('Query Result:', data.records);

        return {
            statusCode: 200,
            body: JSON.stringify(data.records),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
