const db = require('../config/db');
const { logActivity } = require('./auditController');

/**
 * Get all jamaah with optional filter
 * GET /api/v1/jamaah
 */
exports.getAllJamaah = async (req, res) => {
    try {
        const { rt } = req.query;

        let query = 'SELECT * FROM jamaah';
        const params = [];

        if (rt && rt !== 'All') {
            query += ' WHERE rt = ?';
            params.push(rt);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get jamaah error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create new jamaah
 * POST /api/v1/jamaah
 */
exports.createJamaah = async (req, res) => {
    const { nik, nama, jenis_kelamin, rt, no_hp, user_id } = req.body;

    // Validation
    if (!nik || !nama || !jenis_kelamin || !rt) {
        return res.status(400).json({
            success: false,
            message: 'NIK, nama, jenis kelamin, dan RT harus diisi'
        });
    }

    try {
        await db.query(
            'INSERT INTO jamaah (nik, nama, jenis_kelamin, rt, no_hp) VALUES (?, ?, ?, ?, ?)',
            [nik, nama, jenis_kelamin, rt, no_hp || null]
        );

        // Log activity if user_id provided
        if (user_id) {
            await logActivity(user_id, `Menambah jamaah baru: ${nama} (${nik})`);
        }

        res.json({
            success: true,
            message: 'Data jamaah berhasil ditambahkan'
        });

    } catch (error) {
        console.error('Create jamaah error:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'NIK sudah terdaftar!'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update jamaah
 * PUT /api/v1/jamaah/:id
 */
exports.updateJamaah = async (req, res) => {
    const { id } = req.params;
    const { nik, nama, jenis_kelamin, rt, no_hp, user_id } = req.body;

    // Validation
    if (!nik || !nama || !jenis_kelamin || !rt) {
        return res.status(400).json({
            success: false,
            message: 'NIK, nama, jenis kelamin, dan RT harus diisi'
        });
    }

    try {
        const [result] = await db.query(
            'UPDATE jamaah SET nik = ?, nama = ?, jenis_kelamin = ?, rt = ?, no_hp = ? WHERE id = ?',
            [nik, nama, jenis_kelamin, rt, no_hp || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data jamaah tidak ditemukan'
            });
        }

        // Log activity
        if (user_id) {
            await logActivity(user_id, `Mengupdate data jamaah: ${nama}`);
        }

        res.json({
            success: true,
            message: 'Data jamaah berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update jamaah error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete jamaah
 * DELETE /api/v1/jamaah/:id
 */
exports.deleteJamaah = async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query;

    try {
        const [result] = await db.query('DELETE FROM jamaah WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data jamaah tidak ditemukan'
            });
        }

        // Log activity
        if (user_id) {
            await logActivity(user_id, `Menghapus data jamaah ID: ${id}`);
        }

        res.json({
            success: true,
            message: 'Data jamaah berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete jamaah error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
