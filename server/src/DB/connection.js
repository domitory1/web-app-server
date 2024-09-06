const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    passworsd: 'root',
    database: 'webappmenu',
    charset: 'utf8mb4',
    connectionLimit: 10
});

const queryDataBase = async (query) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(query);
        return rows;
    } finally {
        connection.release();
    }
}

module.exports = queryDataBase()