const { Pool } = require('pg');
require('dotenv').config();

// Database configuration for PostgreSQL/Supabase
let pool;

// Get DATABASE_URL and validate it
const databaseUrl = process.env.DATABASE_URL;

// Check if DATABASE_URL is properly set and starts with valid prefix
if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    console.log('📦 Using DATABASE_URL for connection');
    pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else if (databaseUrl && databaseUrl.startsWith('postgres://')) {
    console.log('📦 Using DATABASE_URL for connection');
    pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else if (process.env.DB_HOST) {
    console.log('📦 Using individual DB config (DB_HOST, DB_USER, etc.)');
    pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'halodkm',
        port: parseInt(process.env.DB_PORT) || 5432,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
} else {
    console.error('❌ ERROR: No database configuration found!');
    console.error('Please set DATABASE_URL or individual DB_* environment variables');
    console.error('Example DATABASE_URL: postgresql://user:password@host:5432/database');
    process.exit(1);
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
