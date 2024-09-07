const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'webappmenu',
    charset: 'utf8mb4',
    connectionLimit: 10
});

const connectDB = async () => {
    try {
        await pool.getConnection();
        console.log("MySQL connection pool created successfully");
    } catch (error) {
        console.error("MySQL connection error:", error);
        process.exit(1);
    }
}

const queryDataBase = async (query, params = []) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(query, params);
        return rows;
    } finally {
        connection.release();
    }
}

module.exports = {connectDB, queryDataBase};