const db = require('../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Login endpoint
 * POST /api/v1/auth/login
 */
exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username dan password harus diisi'
        });
    }

    try {
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username tidak ditemukan'
            });
        }

        const user = users[0];

        // Check password with bcrypt
        // First check if password is hashed (starts with $2) or plain text
        let isValidPassword = false;
        if (user.password.startsWith('$2')) {
            isValidPassword = await bcrypt.compare(password, user.password);
        } else {
            // Legacy plain text password - check match and hash it
            isValidPassword = (user.password === password);
            if (isValidPassword) {
                // Upgrade to hashed password
                const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
                await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
            }
        }

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Password salah'
            });
        }

        const userData = {
            id: user.id,
            username: user.username,
            role: user.role,
            full_name: user.full_name,
            rt: user.rt
        };

        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [user.id, `Login: ${user.username} (${user.role})`]
        );

        res.json({
            success: true,
            message: 'Login berhasil',
            token: `token-${user.id}-${Date.now()}`,
            user: userData,
            data: userData
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
 * Register endpoint for Jamaah
 * POST /api/v1/auth/register
 */
exports.register = async (req, res) => {
    const { username, password, full_name, no_hp } = req.body;

    if (!username || !password || !full_name) {
        return res.status(400).json({
            success: false,
            message: 'Username, password, dan nama lengkap harus diisi'
        });
    }

    if (username.length < 4) {
        return res.status(400).json({
            success: false,
            message: 'Username minimal 4 karakter'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password minimal 6 karakter'
        });
    }

    try {
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username sudah digunakan'
            });
        }

        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const [result] = await db.query(
            'INSERT INTO users (username, password, full_name, role, rt) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [username, hashedPassword, full_name, 'jamaah', no_hp || null]
        );

        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [result[0]?.id || 1, `Register: ${username} (jamaah)`]
        );

        res.status(201).json({
            success: true,
            message: 'Pendaftaran berhasil! Silakan login dengan akun Anda.'
        });

    } catch (err) {
        console.error('Register error:', err);
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
    res.json({
        success: true,
        message: 'Logout berhasil'
    });
};

/**
 * Admin Reset Password for User
 * POST /api/v1/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'User ID dan password baru harus diisi'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password minimal 6 karakter'
        });
    }

    try {
        // Check if user exists
        const [users] = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Admin reset password for user ID ${userId} (${users[0].username})`]
        );

        res.json({
            success: true,
            message: `Password untuk ${users[0].username} berhasil direset`
        });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};
