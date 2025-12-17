const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Manual CORS headers (must be before other middleware)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`); // Debug logging

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-info');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        return res.status(200).end();
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const routes = require('./routes/api');
app.use('/api/v1', routes);

// Health check endpoints (for Render and monitoring)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'HaloDKM Backend is running' });
});
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', message: 'HaloDKM API is running', version: 'v1' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 HaloDKM Backend Server is running`);
    console.log(`📦 Environment: ${process.env.DB_HOST === 'mysql' ? 'Docker' : 'Local'}`);
    console.log(`📍 Internal: http://0.0.0.0:${PORT}/api/v1`);
    console.log(`🌐 External: http://localhost:${PORT}/api/v1`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health\n`);
});
