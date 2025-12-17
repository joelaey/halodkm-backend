const db = require('../config/db');

/**
 * Login endpoint
 * POST /api/v1/auth/login
 */
exports.login = async (req, res) => {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username dan password harus diisi'
        });
    }

    try {
        // Query user from database
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        // Check if user exists
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username tidak ditemukan'
            });
        }

        const user = users[0];

        // Simple password check (in production, use bcrypt!)
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Password salah'
            });
        }

        // Success response - include token and user at root level for frontend
        const userData = {
            id: user.id,
            username: user.username,
            role: user.role,
            full_name: user.full_name,
            rt: user.rt // For RT-level access control
        };

        // Log login to audit
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [user.id, `Login: ${user.username} (${user.role})`]
        );

        res.json({
            success: true,
            message: 'Login berhasil',
            token: `token-${user.id}-${Date.now()}`, // Simple token for now
            user: userData,
            data: userData // Keep for backwards compatibility
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};

/**
 * Logout endpoint
 * POST /api/v1/auth/logout
 */
exports.logout = async (req, res) => {
    // In a stateless API, logout is typically handled on the frontend
    // by removing the token. This endpoint can be used for logging purposes.
    res.json({
        success: true,
        message: 'Logout berhasil'
    });
};
