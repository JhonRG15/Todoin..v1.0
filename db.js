// Importa el cliente oficial de SQL Server para Node.js
const sql = require('mssql');
// Carga las variables de entorno desde el archivo .env
require('dotenv').config();

// Configuración de la conexión a la base de datos Azure SQL
const config = {
    server: process.env.AZURE_SQL_SERVER,     // Nombre del servidor Azure SQL
    database: process.env.AZURE_SQL_DATABASE, // Nombre de la base de datos
    port: 1433,                               // Puerto estándar para SQL Server
    user: process.env.AZURE_SQL_USER,         // Usuario de la base de datos
    password: process.env.AZURE_SQL_PASSWORD  // Contraseña de acceso
};

/**
 * Establece la conexión global con la base de datos SQL Server.
 */
const connectDB = async () => {
    try {
        await sql.connect(config);
        console.log('✅ Connected to Azure SQL Database');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
};

/**
 * Verifica si la conexión con la base de datos está activa realizando una consulta simple.
 * @returns {Promise<boolean>} true si la conexión funciona, false de lo contrario.
 */
const checkConnection = async () => {
    try {
        await new sql.Request().query('SELECT 1');
        return true;
    } catch (err) {
        return false;
    }
};

// Exportación de los módulos y funciones de base de datos
module.exports = {
    sql,
    connectDB,
    checkConnection
};
