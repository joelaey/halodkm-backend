const db = require('../config/db');

/**
 * Get all kas transactions with optional filters
 * GET /api/v1/kas
 */
exports.getAllKas = async (req, res) => {
    try {
        const { start_date, end_date, type } = req.query;

        let query = 'SELECT * FROM kas_masjid WHERE 1=1';
        const params = [];

        // Add filters
        if (start_date) {
            query += ' AND tanggal >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND tanggal <= ?';
            params.push(end_date);
        }

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY tanggal DESC, created_at DESC';

        const [transactions] = await db.query(query, params);

        // Calculate summary
        const [summary] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0) as total_masuk,
                COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0) as total_keluar,
                COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE -amount END), 0) as saldo
            FROM kas_masjid
        `);

        res.json({
            success: true,
            data: {
                data: transactions,
                summary: {
                    total_masuk: Number(summary[0].total_masuk),
                    total_keluar: Number(summary[0].total_keluar),
                    saldo: Number(summary[0].saldo)
                }
            }
        });

    } catch (error) {
        console.error('Get kas error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create new kas transaction
 * POST /api/v1/kas
 */
exports.createKas = async (req, res) => {
    const { type, amount, description, category, tanggal } = req.body;

    // Validation
    if (!type || !amount || !description || !tanggal) {
        return res.status(400).json({
            success: false,
            message: 'Type, amount, description, dan tanggal harus diisi'
        });
    }

    if (type !== 'masuk' && type !== 'keluar') {
        return res.status(400).json({
            success: false,
            message: 'Type harus "masuk" atau "keluar"'
        });
    }

    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount harus lebih dari 0'
        });
    }

    try {
        await db.query(
            'INSERT INTO kas_masjid (type, amount, description, category, tanggal) VALUES (?, ?, ?, ?, ?)',
            [type, amount, description, category || null, tanggal]
        );

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userInfo.id || 1, `Menambah transaksi kas: ${type} Rp ${amount.toLocaleString()} - ${description}`]
        );

        res.json({
            success: true,
            message: 'Transaksi berhasil ditambahkan'
        });

    } catch (error) {
        console.error('Create kas error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update kas transaction
 * PUT /api/v1/kas/:id
 */
exports.updateKas = async (req, res) => {
    const { id } = req.params;
    const { type, amount, description, category, tanggal } = req.body;

    // Validation
    if (!type || !amount || !description || !tanggal) {
        return res.status(400).json({
            success: false,
            message: 'Type, amount, description, dan tanggal harus diisi'
        });
    }

    if (type !== 'masuk' && type !== 'keluar') {
        return res.status(400).json({
            success: false,
            message: 'Type harus "masuk" atau "keluar"'
        });
    }

    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount harus lebih dari 0'
        });
    }

    try {
        const [result] = await db.query(
            'UPDATE kas_masjid SET type = ?, amount = ?, description = ?, category = ?, tanggal = ? WHERE id = ?',
            [type, amount, description, category || null, tanggal, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaksi tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userInfo.id || 1, `Mengupdate transaksi kas ID ${id}: ${type} Rp ${amount.toLocaleString()} - ${description}`]
        );

        res.json({
            success: true,
            message: 'Transaksi berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update kas error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete kas transaction
 * DELETE /api/v1/kas/:id
 */
exports.deleteKas = async (req, res) => {
    const { id } = req.params;

    try {
        // Get transaction info before delete
        const [trans] = await db.query('SELECT * FROM kas_masjid WHERE id = ?', [id]);

        const [result] = await db.query('DELETE FROM kas_masjid WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaksi tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        const transInfo = trans[0] ? `${trans[0].type} Rp ${trans[0].amount}` : `ID ${id}`;
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userInfo.id || 1, `Menghapus transaksi kas: ${transInfo}`]
        );

        res.json({
            success: true,
            message: 'Transaksi berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete kas error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
