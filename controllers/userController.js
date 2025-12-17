const db = require('../config/db');

/**
 * Get all users
 * GET /api/v1/users
 */
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, username, full_name, role, rt, created_at FROM users ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create new user
 * POST /api/v1/users
 */
exports.createUser = async (req, res) => {
    const { username, password, full_name, role, rt } = req.body;

    // Validation
    if (!username || !password || !full_name || !role) {
        return res.status(400).json({
            success: false,
            message: 'Username, password, full name, dan role harus diisi'
        });
    }

    try {
        await db.query(
            'INSERT INTO users (username, password, full_name, role, rt) VALUES (?, ?, ?, ?, ?)',
            [username, password, full_name, role, rt || null]
        );

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userInfo.id || 1, `Menambah user baru: ${username} (${role})`]
        );

        res.json({
            success: true,
            message: 'User berhasil ditambahkan'
        });

    } catch (error) {
        console.error('Create user error:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Username sudah digunakan!'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update user
 * PUT /api/v1/users/:id
 */
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, password, full_name, role, rt } = req.body;

    // Validation
    if (!username || !full_name || !role) {
        return res.status(400).json({
            success: false,
            message: 'Username, full name, dan role harus diisi'
        });
    }

    try {
        let query, params;

        // If password is provided, update it too
        if (password) {
            query = 'UPDATE users SET username = ?, password = ?, full_name = ?, role = ?, rt = ? WHERE id = ?';
            params = [username, password, full_name, role, rt || null, id];
        } else {
            query = 'UPDATE users SET username = ?, full_name = ?, role = ?, rt = ? WHERE id = ?';
            params = [username, full_name, role, rt || null, id];
        }

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'User berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete user
 * DELETE /api/v1/users/:id
 */
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        // Get user info before delete
        const [users] = await db.query('SELECT username FROM users WHERE id = ?', [id]);

        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        const deletedUsername = users[0] ? users[0].username : `ID ${id}`;
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userInfo.id || 1, `Menghapus user: ${deletedUsername}`]
        );

        res.json({
            success: true,
            message: 'User berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
