const db = require('../config/db');

/**
 * Get all penduduk khusus with optional label filter
 * GET /api/v1/penduduk-khusus
 */
exports.getAllPendudukKhusus = async (req, res) => {
    try {
        const { label } = req.query;

        let query = 'SELECT * FROM penduduk_khusus WHERE 1=1';
        const params = [];

        if (label) {
            query += ' AND label = $1';
            params.push(label);
        }

        query += ' ORDER BY nama ASC';

        const [rows] = await db.query(query, params);

        // Get counts per label
        const [countRows] = await db.query(`
            SELECT 
                label,
                COUNT(*) as count
            FROM penduduk_khusus
            GROUP BY label
        `);

        const labelCounts = {
            kontrak: 0,
            pedagang: 0,
            warga_dusun_lain: 0
        };

        countRows.forEach(row => {
            labelCounts[row.label] = parseInt(row.count);
        });

        res.json({
            success: true,
            data: {
                data: rows,
                total: rows.length,
                labelCounts
            }
        });

    } catch (error) {
        console.error('Get penduduk khusus error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get single penduduk khusus by ID
 * GET /api/v1/penduduk-khusus/:id
 */
exports.getPendudukKhusus = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM penduduk_khusus WHERE id = $1', [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Penduduk khusus tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error('Get penduduk khusus error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create new penduduk khusus
 * POST /api/v1/penduduk-khusus
 */
exports.createPendudukKhusus = async (req, res) => {
    const { nik, nama, jenis_kelamin, alamat, no_hp, label, keterangan } = req.body;

    // Validation
    if (!nik || !nama || !jenis_kelamin || !label) {
        return res.status(400).json({
            success: false,
            message: 'NIK, nama, jenis kelamin, dan label harus diisi'
        });
    }

    if (!['kontrak', 'pedagang', 'warga_dusun_lain'].includes(label)) {
        return res.status(400).json({
            success: false,
            message: 'Label harus salah satu dari: kontrak, pedagang, warga_dusun_lain'
        });
    }

    try {
        const [rows] = await db.query(
            `INSERT INTO penduduk_khusus (nik, nama, jenis_kelamin, alamat, no_hp, label, keterangan) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [nik, nama, jenis_kelamin, alamat || null, no_hp || null, label, keterangan || null]
        );

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Menambah penduduk khusus: ${nama} (${label})`]
        );

        res.json({
            success: true,
            message: 'Penduduk khusus berhasil ditambahkan',
            data: { id: rows[0].id }
        });

    } catch (error) {
        console.error('Create penduduk khusus error:', error);
        if (error.code === '23505') { // PostgreSQL unique violation
            return res.status(400).json({
                success: false,
                message: 'NIK sudah terdaftar'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update penduduk khusus
 * PUT /api/v1/penduduk-khusus/:id
 */
exports.updatePendudukKhusus = async (req, res) => {
    const { id } = req.params;
    const { nik, nama, jenis_kelamin, alamat, no_hp, label, keterangan } = req.body;

    // Validation
    if (!nik || !nama || !jenis_kelamin || !label) {
        return res.status(400).json({
            success: false,
            message: 'NIK, nama, jenis kelamin, dan label harus diisi'
        });
    }

    if (!['kontrak', 'pedagang', 'warga_dusun_lain'].includes(label)) {
        return res.status(400).json({
            success: false,
            message: 'Label harus salah satu dari: kontrak, pedagang, warga_dusun_lain'
        });
    }

    try {
        const [rows, result] = await db.query(
            `UPDATE penduduk_khusus 
             SET nik = $1, nama = $2, jenis_kelamin = $3, alamat = $4, no_hp = $5, label = $6, keterangan = $7
             WHERE id = $8`,
            [nik, nama, jenis_kelamin, alamat || null, no_hp || null, label, keterangan || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Penduduk khusus tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Mengupdate penduduk khusus ID ${id}: ${nama}`]
        );

        res.json({
            success: true,
            message: 'Penduduk khusus berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update penduduk khusus error:', error);
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'NIK sudah terdaftar'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete penduduk khusus
 * DELETE /api/v1/penduduk-khusus/:id
 */
exports.deletePendudukKhusus = async (req, res) => {
    const { id } = req.params;

    try {
        // Get info before delete
        const [existing] = await db.query('SELECT * FROM penduduk_khusus WHERE id = $1', [id]);

        const [rows, result] = await db.query('DELETE FROM penduduk_khusus WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Penduduk khusus tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        const info = existing[0] ? existing[0].nama : `ID ${id}`;
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Menghapus penduduk khusus: ${info}`]
        );

        res.json({
            success: true,
            message: 'Penduduk khusus berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete penduduk khusus error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
