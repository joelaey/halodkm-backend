const db = require('../config/db');

/**
 * Get all info publik
 * GET /api/v1/info
 */
exports.getAllInfo = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM info_publik ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get info error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create new info
 * POST /api/v1/info
 */
exports.createInfo = async (req, res) => {
    const { title, content, category, tanggal } = req.body;

    // Validation
    if (!title || !content || !category || !tanggal) {
        return res.status(400).json({
            success: false,
            message: 'Title, content, category, dan tanggal harus diisi'
        });
    }

    try {
        await db.query(
            'INSERT INTO info_publik (title, content, category, tanggal) VALUES (?, ?, ?, ?)',
            [title, content, category, tanggal]
        );

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userInfo.id || 1, `Menambah informasi: ${title} (${category})`]
        );

        res.json({
            success: true,
            message: 'Info berhasil ditambahkan'
        });

    } catch (error) {
        console.error('Create info error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update info
 * PUT /api/v1/info/:id
 */
exports.updateInfo = async (req, res) => {
    const { id } = req.params;
    const { title, content, category, tanggal } = req.body;

    // Validation
    if (!title || !content || !category || !tanggal) {
        return res.status(400).json({
            success: false,
            message: 'Title, content, category, dan tanggal harus diisi'
        });
    }

    try {
        const [result] = await db.query(
            'UPDATE info_publik SET title = ?, content = ?, category = ?, tanggal = ? WHERE id = ?',
            [title, content, category, tanggal, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Info tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userInfo.id || 1, `Mengupdate informasi: ${title}`]
        );

        res.json({
            success: true,
            message: 'Info berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update info error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete info
 * DELETE /api/v1/info/:id
 */
exports.deleteInfo = async (req, res) => {
    const { id } = req.params;

    try {
        // Get info before delete
        const [info] = await db.query('SELECT title FROM info_publik WHERE id = ?', [id]);

        const [result] = await db.query('DELETE FROM info_publik WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Info tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        const infoTitle = info[0] ? info[0].title : `ID ${id}`;
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userInfo.id || 1, `Menghapus informasi: ${infoTitle}`]
        );

        res.json({
            success: true,
            message: 'Info berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete info error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
