require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:             process.env.DB_HOST     || 'localhost',
    user:             process.env.DB_USER     || 'root',
    password:         process.env.DB_PASSWORD || 'rootpassword',
    database:         process.env.DB_NAME     || 'arena_gamer',
    waitForConnections: true,
    connectionLimit:  10,
    timezone:         'local'
});

module.exports = pool;
