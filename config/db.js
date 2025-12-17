const { Pool } = require('pg');
require('dotenv').config();

// Database configuration for PostgreSQL/Supabase
let pool;

// Support DATABASE_URL (Supabase/Render format) or individual config
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'halodkm',
        port: process.env.DB_PORT || 5432,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
}

// Test database connection
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL database connected successfully');
        client.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.error('Please check your database configuration');
    });

/**
 * Convert MySQL-style query placeholders (?) to PostgreSQL-style ($1, $2, etc.)
 * This allows existing code using ? placeholders to work with PostgreSQL
 */
const convertPlaceholders = (query) => {
    let index = 0;
    return query.replace(/\?/g, () => {
        index++;
        return `$${index}`;
    });
};

/**
 * Helper function to match mysql2/promise API style
 * This allows existing code to work with minimal changes
 * - Converts ? placeholders to $1, $2, etc.
 * - Returns [rows, result] format like mysql2
 * - Adds affectedRows property for UPDATE/DELETE compatibility
 */
const query = async (text, params) => {
    const pgQuery = convertPlaceholders(text);
    const result = await pool.query(pgQuery, params);

    // Add affectedRows property for mysql2 compatibility
    result.affectedRows = result.rowCount;

    return [result.rows, result];
};

module.exports = { query, pool };
