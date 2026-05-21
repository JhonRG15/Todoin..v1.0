const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    port: 1433,
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD
};

const connectDB = async () => {
    try {
        await sql.connect(config);
        console.log('✅ Connected to Azure SQL Database');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
};

const checkConnection = async () => {
    try {
        await new sql.Request().query('SELECT 1');
        return true;
    } catch (err) {
        return false;
    }
};

module.exports = {
    sql,
    connectDB,
    checkConnection
};
