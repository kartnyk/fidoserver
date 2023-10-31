const mysql = require('mysql');

exports.handler = async (event) => {
  const connection = mysql.createConnection({
    host: 'your-aurora-hostname',
    user: 'your-db-username',
    password: 'your-db-password',
    database: 'your-db-name',
  });

  try {
    // Connect to the database
    connection.connect();

    // Query the database
    const results = await queryDatabase(connection);

    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error connecting to the database' }),
    };
  } finally {
    // Close the database connection
    connection.end();
  }
};

function queryDatabase(connection) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM your_table_name';
    connection.query(query, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}
