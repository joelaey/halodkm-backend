const db = require('../config/db');

/**
 * Get all events
 * GET /api/v1/events
 */
exports.getAllEvents = async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT e.*, 
                   COALESCE(SUM(CASE WHEN ek.type = 'masuk' THEN ek.amount ELSE 0 END), 0) as total_masuk,
                   COALESCE(SUM(CASE WHEN ek.type = 'keluar' THEN ek.amount ELSE 0 END), 0) as total_keluar,
                   COALESCE(SUM(CASE WHEN ek.type = 'masuk' THEN ek.amount ELSE -ek.amount END), 0) as saldo,
                   (SELECT COUNT(*) FROM event_recipients WHERE event_id = e.id) as total_recipients
            FROM events e
            LEFT JOIN event_kas ek ON e.id = ek.event_id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND e.status = $${params.length}`;
        }

        query += ` GROUP BY e.id ORDER BY e.tanggal_mulai DESC, e.created_at DESC`;

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows.map(row => ({
                ...row,
                total_masuk: Number(row.total_masuk),
                total_keluar: Number(row.total_keluar),
                saldo: Number(row.saldo),
                total_recipients: Number(row.total_recipients || 0)
            }))
        });

    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get single event with transactions
 * GET /api/v1/events/:id
 */
exports.getEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // Get event info
        const [eventRows] = await db.query('SELECT * FROM events WHERE id = $1', [id]);

        if (eventRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event tidak ditemukan'
            });
        }

        // Get transactions
        const [transRows] = await db.query(
            'SELECT * FROM event_kas WHERE event_id = $1 ORDER BY tanggal DESC, created_at DESC',
            [id]
        );

        // Calculate summary
        const [summaryRows] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0) as total_masuk,
                COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0) as total_keluar,
                COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE -amount END), 0) as saldo
            FROM event_kas
            WHERE event_id = $1
        `, [id]);

        res.json({
            success: true,
            data: {
                event: eventRows[0],
                transactions: transRows,
                summary: {
                    total_masuk: Number(summaryRows[0].total_masuk),
                    total_keluar: Number(summaryRows[0].total_keluar),
                    saldo: Number(summaryRows[0].saldo)
                }
            }
        });

    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create new event
 * POST /api/v1/events
 */
exports.createEvent = async (req, res) => {
    const { nama, deskripsi, tipe, tanggal_mulai } = req.body;

    if (!nama || !tanggal_mulai) {
        return res.status(400).json({
            success: false,
            message: 'Nama dan tanggal mulai harus diisi'
        });
    }

    const eventType = tipe || 'penggalangan_dana';
    if (!['penggalangan_dana', 'distribusi'].includes(eventType)) {
        return res.status(400).json({
            success: false,
            message: 'Tipe event harus "penggalangan_dana" atau "distribusi"'
        });
    }

    try {
        const [rows] = await db.query(
            `INSERT INTO events (nama, deskripsi, tipe, tanggal_mulai) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [nama, deskripsi || null, eventType, tanggal_mulai]
        );

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Membuat event baru: ${nama}`]
        );

        res.json({
            success: true,
            message: 'Event berhasil dibuat',
            data: { id: rows[0].id }
        });

    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update event
 * PUT /api/v1/events/:id
 */
exports.updateEvent = async (req, res) => {
    const { id } = req.params;
    const { nama, deskripsi, tipe, tanggal_mulai } = req.body;

    if (!nama || !tanggal_mulai) {
        return res.status(400).json({
            success: false,
            message: 'Nama dan tanggal mulai harus diisi'
        });
    }

    const eventType = tipe || 'penggalangan_dana';

    try {
        const [rows, result] = await db.query(
            `UPDATE events SET nama = $1, deskripsi = $2, tipe = $3, tanggal_mulai = $4 WHERE id = $5`,
            [nama, deskripsi || null, eventType, tanggal_mulai, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Mengupdate event ID ${id}: ${nama}`]
        );

        res.json({
            success: true,
            message: 'Event berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete event
 * DELETE /api/v1/events/:id
 */
exports.deleteEvent = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if event has transactions
        const [transCheck] = await db.query('SELECT COUNT(*) as count FROM event_kas WHERE event_id = $1', [id]);

        if (parseInt(transCheck[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Event memiliki transaksi. Hapus semua transaksi terlebih dahulu atau selesaikan event.'
            });
        }

        const [existing] = await db.query('SELECT * FROM events WHERE id = $1', [id]);
        const [rows, result] = await db.query('DELETE FROM events WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        const info = existing[0] ? existing[0].nama : `ID ${id}`;
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Menghapus event: ${info}`]
        );

        res.json({
            success: true,
            message: 'Event berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Complete event - transfer remaining balance to Kas Masjid
 * POST /api/v1/events/:id/complete
 */
exports.completeEvent = async (req, res) => {
    const { id } = req.params;

    try {
        // Get event info
        const [eventRows] = await db.query('SELECT * FROM events WHERE id = $1', [id]);

        if (eventRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event tidak ditemukan'
            });
        }

        const event = eventRows[0];

        if (event.status === 'selesai') {
            return res.status(400).json({
                success: false,
                message: 'Event sudah selesai'
            });
        }

        // Calculate saldo
        const [summaryRows] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE -amount END), 0) as saldo
            FROM event_kas
            WHERE event_id = $1
        `, [id]);

        const saldo = Number(summaryRows[0].saldo);

        // Check if saldo is negative
        if (saldo < 0) {
            return res.status(400).json({
                success: false,
                message: `Saldo event negatif (${saldo.toLocaleString('id-ID')}). Tidak dapat menyelesaikan event dengan saldo negatif.`
            });
        }

        // Start transaction
        const client = db;

        // Update event status
        await client.query(
            `UPDATE events SET status = 'selesai', tanggal_selesai = CURRENT_DATE WHERE id = $1`,
            [id]
        );

        // If saldo > 0, transfer to Kas Masjid
        if (saldo > 0) {
            await client.query(
                `INSERT INTO kas_masjid (type, amount, description, category, tanggal) 
                 VALUES ('masuk', $1, $2, 'Transfer Event', CURRENT_DATE)`,
                [saldo, `Sisa dana Event: ${event.nama}`]
            );
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await client.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Menyelesaikan event "${event.nama}" dengan saldo Rp ${saldo.toLocaleString('id-ID')} ditransfer ke Kas Masjid`]
        );

        res.json({
            success: true,
            message: saldo > 0
                ? `Event berhasil diselesaikan. Sisa dana Rp ${saldo.toLocaleString('id-ID')} telah ditransfer ke Kas Masjid.`
                : 'Event berhasil diselesaikan.',
            data: {
                transferred_amount: saldo
            }
        });

    } catch (error) {
        console.error('Complete event error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create event transaction
 * POST /api/v1/events/:id/transactions
 */
exports.createEventTransaction = async (req, res) => {
    const { id } = req.params;
    const { type, amount, description, tanggal } = req.body;

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

    try {
        // Check if event exists and is active
        const [eventRows] = await db.query('SELECT * FROM events WHERE id = $1', [id]);

        if (eventRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event tidak ditemukan'
            });
        }

        if (eventRows[0].status === 'selesai') {
            return res.status(400).json({
                success: false,
                message: 'Tidak dapat menambah transaksi ke event yang sudah selesai'
            });
        }

        const [rows] = await db.query(
            `INSERT INTO event_kas (event_id, type, amount, description, tanggal) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [id, type, amount, description, tanggal]
        );

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Menambah transaksi event ${eventRows[0].nama}: ${type} Rp ${amount.toLocaleString('id-ID')}`]
        );

        res.json({
            success: true,
            message: 'Transaksi berhasil ditambahkan',
            data: { id: rows[0].id }
        });

    } catch (error) {
        console.error('Create event transaction error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update event transaction
 * PUT /api/v1/events/:id/transactions/:transId
 */
exports.updateEventTransaction = async (req, res) => {
    const { id, transId } = req.params;
    const { type, amount, description, tanggal } = req.body;

    if (!type || !amount || !description || !tanggal) {
        return res.status(400).json({
            success: false,
            message: 'Type, amount, description, dan tanggal harus diisi'
        });
    }

    try {
        // Check if event is active
        const [eventRows] = await db.query('SELECT * FROM events WHERE id = $1', [id]);

        if (eventRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event tidak ditemukan'
            });
        }

        if (eventRows[0].status === 'selesai') {
            return res.status(400).json({
                success: false,
                message: 'Tidak dapat mengubah transaksi event yang sudah selesai'
            });
        }

        const [rows, result] = await db.query(
            `UPDATE event_kas SET type = $1, amount = $2, description = $3, tanggal = $4 
             WHERE id = $5 AND event_id = $6`,
            [type, amount, description, tanggal, transId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaksi tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Mengupdate transaksi event ID ${transId}`]
        );

        res.json({
            success: true,
            message: 'Transaksi berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update event transaction error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete event transaction
 * DELETE /api/v1/events/:id/transactions/:transId
 */
exports.deleteEventTransaction = async (req, res) => {
    const { id, transId } = req.params;

    try {
        // Check if event is active
        const [eventRows] = await db.query('SELECT * FROM events WHERE id = $1', [id]);

        if (eventRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event tidak ditemukan'
            });
        }

        if (eventRows[0].status === 'selesai') {
            return res.status(400).json({
                success: false,
                message: 'Tidak dapat menghapus transaksi event yang sudah selesai'
            });
        }

        const [rows, result] = await db.query(
            'DELETE FROM event_kas WHERE id = $1 AND event_id = $2',
            [transId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaksi tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Menghapus transaksi event ID ${transId}`]
        );

        res.json({
            success: true,
            message: 'Transaksi berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete event transaction error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===== EVENT RECIPIENTS MANAGEMENT =====

/**
 * Get all recipients for an event
 * GET /api/v1/events/:id/recipients
 */
exports.getEventRecipients = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(
            'SELECT * FROM event_recipients WHERE event_id = $1 ORDER BY nama ASC',
            [id]
        );

        res.json({
            success: true,
            data: rows,
            total: rows.length
        });

    } catch (error) {
        console.error('Get event recipients error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create event recipient
 * POST /api/v1/events/:id/recipients
 */
exports.createEventRecipient = async (req, res) => {
    const { id } = req.params;
    const { nama, alamat, no_hp, jenis_bantuan, jumlah, keterangan } = req.body;

    if (!nama) {
        return res.status(400).json({
            success: false,
            message: 'Nama penerima harus diisi'
        });
    }

    try {
        // Check if event exists
        const [eventRows] = await db.query('SELECT * FROM events WHERE id = $1', [id]);

        if (eventRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event tidak ditemukan'
            });
        }

        const [rows] = await db.query(
            `INSERT INTO event_recipients (event_id, nama, alamat, no_hp, jenis_bantuan, jumlah, keterangan) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [id, nama, alamat || null, no_hp || null, jenis_bantuan || null, jumlah || null, keterangan || null]
        );

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Menambah penerima "${nama}" ke event ${eventRows[0].nama}`]
        );

        res.json({
            success: true,
            message: 'Penerima berhasil ditambahkan',
            data: { id: rows[0].id }
        });

    } catch (error) {
        console.error('Create event recipient error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update event recipient
 * PUT /api/v1/events/:id/recipients/:recipientId
 */
exports.updateEventRecipient = async (req, res) => {
    const { id, recipientId } = req.params;
    const { nama, alamat, no_hp, jenis_bantuan, jumlah, keterangan } = req.body;

    if (!nama) {
        return res.status(400).json({
            success: false,
            message: 'Nama penerima harus diisi'
        });
    }

    try {
        const [rows, result] = await db.query(
            `UPDATE event_recipients 
             SET nama = $1, alamat = $2, no_hp = $3, jenis_bantuan = $4, jumlah = $5, keterangan = $6
             WHERE id = $7 AND event_id = $8`,
            [nama, alamat || null, no_hp || null, jenis_bantuan || null, jumlah || null, keterangan || null, recipientId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Penerima tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Mengupdate penerima ID ${recipientId}`]
        );

        res.json({
            success: true,
            message: 'Penerima berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update event recipient error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete event recipient
 * DELETE /api/v1/events/:id/recipients/:recipientId
 */
exports.deleteEventRecipient = async (req, res) => {
    const { id, recipientId } = req.params;

    try {
        const [rows, result] = await db.query(
            'DELETE FROM event_recipients WHERE id = $1 AND event_id = $2',
            [recipientId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Penerima tidak ditemukan'
            });
        }

        // Log to audit
        const userInfo = req.userInfo || {};
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [userInfo.id || 1, `Menghapus penerima ID ${recipientId}`]
        );

        res.json({
            success: true,
            message: 'Penerima berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete event recipient error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
