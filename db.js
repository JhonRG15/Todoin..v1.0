const sql = require('mssql');
require('dotenv').config();

const config = process.env.DATABASE_URL;

const connectDB = async () => {
    try {
        await sql.connect(config);
        console.log('✅ Connected to Azure SQL Database');
    } catch (err) {
        console.log('❌ Database connection failed:', err.message);
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
