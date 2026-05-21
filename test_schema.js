const { sql, connectDB } = require('./db');
async function run() {
    await connectDB();
    const result = await sql.query("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('usuarios', 'marcadores')");
    console.log(result.recordset);
    process.exit(0);
}
run();