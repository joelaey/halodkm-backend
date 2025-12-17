const db = require('../config/db');
const { logActivity } = require('./auditController');

/**
 * Get all families with optional dusun filter
 * GET /api/v1/families
 */
exports.getAllFamilies = async (req, res) => {
    try {
        const { rt } = req.query;

        let query = `
            SELECT 
                f.*,
                COUNT(fm.id) as member_count
            FROM families f
            LEFT JOIN family_members fm ON f.id = fm.family_id
        `;

        const params = [];

        if (rt && rt !== 'All') {
            query += ' WHERE f.rt = ?';
            params.push(rt);
        }

        query += ' GROUP BY f.id ORDER BY f.created_at DESC';

        const [families] = await db.query(query, params);

        res.json({
            success: true,
            data: families
        });

    } catch (error) {
        console.error('Get families error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get single family with members
 * GET /api/v1/families/:id
 */
exports.getFamily = async (req, res) => {
    try {
        const { id } = req.params;

        const [families] = await db.query('SELECT * FROM families WHERE id = ?', [id]);

        if (families.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Keluarga tidak ditemukan'
            });
        }

        const [members] = await db.query(
            'SELECT * FROM family_members WHERE family_id = ? ORDER BY hubungan, nama',
            [id]
        );

        res.json({
            success: true,
            data: {
                family: families[0],
                members: members
            }
        });

    } catch (error) {
        console.error('Get family error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get family members
 * GET /api/v1/families/:id/members
 */
exports.getFamilyMembers = async (req, res) => {
    try {
        const { id } = req.params;

        const [members] = await db.query(
            'SELECT * FROM family_members WHERE family_id = ? ORDER BY hubungan, nama',
            [id]
        );

        res.json({
            success: true,
            data: members
        });

    } catch (error) {
        console.error('Get family members error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Create new family
 * POST /api/v1/families
 */
exports.createFamily = async (req, res) => {
    const { no_kk, kepala_keluarga, rt, alamat, no_hp, nik_kepala, jenis_kelamin_kepala, tanggal_lahir_kepala, user_id } = req.body;

    // Validation
    if (!no_kk || !kepala_keluarga || !rt) {
        return res.status(400).json({
            success: false,
            message: 'No KK, kepala keluarga, dan RT harus diisi'
        });
    }

    // NIK kepala keluarga wajib untuk auto-add ke family_members
    if (!nik_kepala || !jenis_kelamin_kepala) {
        return res.status(400).json({
            success: false,
            message: 'NIK dan jenis kelamin kepala keluarga harus diisi'
        });
    }

    try {
        // 1. Insert family
        const [result] = await db.query(
            'INSERT INTO families (no_kk, kepala_keluarga, rt, alamat, no_hp) VALUES (?, ?, ?, ?, ?)',
            [no_kk, kepala_keluarga, rt, alamat || null, no_hp || null]
        );

        const familyId = result.insertId;

        // 2. Auto-add kepala keluarga as family member
        await db.query(
            'INSERT INTO family_members (family_id, nik, nama, hubungan, jenis_kelamin, tanggal_lahir) VALUES (?, ?, ?, ?, ?, ?)',
            [familyId, nik_kepala, kepala_keluarga, 'Kepala Keluarga', jenis_kelamin_kepala, tanggal_lahir_kepala || null]
        );

        // Log activity
        if (user_id) {
            await logActivity(user_id, `Menambah keluarga baru: ${kepala_keluarga} (No KK: ${no_kk})`);
        }

        res.json({
            success: true,
            message: 'Data keluarga berhasil ditambahkan',
            data: { id: familyId }
        });

    } catch (error) {
        console.error('Create family error:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'No KK atau NIK sudah terdaftar!'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update family
 * PUT /api/v1/families/:id
 */
exports.updateFamily = async (req, res) => {
    const { id } = req.params;
    const { no_kk, kepala_keluarga, rt, alamat, no_hp, user_id } = req.body;

    // Validation
    if (!no_kk || !kepala_keluarga || !rt) {
        return res.status(400).json({
            success: false,
            message: 'No KK, kepala keluarga, dan RT harus diisi'
        });
    }

    try {
        const [result] = await db.query(
            'UPDATE families SET no_kk = ?, kepala_keluarga = ?, rt = ?, alamat = ?, no_hp = ? WHERE id = ?',
            [no_kk, kepala_keluarga, rt, alamat || null, no_hp || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data keluarga tidak ditemukan'
            });
        }

        // Log activity
        if (user_id) {
            await logActivity(user_id, `Mengupdate data keluarga: ${kepala_keluarga}`);
        }

        res.json({
            success: true,
            message: 'Data keluarga berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update family error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete family (and cascade delete members)
 * DELETE /api/v1/families/:id
 */
exports.deleteFamily = async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query;

    try {
        const [result] = await db.query('DELETE FROM families WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data keluarga tidak ditemukan'
            });
        }

        // Log activity
        if (user_id) {
            await logActivity(user_id, `Menghapus data keluarga ID: ${id}`);
        }

        res.json({
            success: true,
            message: 'Data keluarga berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete family error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Add family member
 * POST /api/v1/families/:id/members
 */
exports.addFamilyMember = async (req, res) => {
    const { id } = req.params;
    const { nik, nama, hubungan, jenis_kelamin, tanggal_lahir, user_id } = req.body;

    // Validation
    if (!nik || !nama || !hubungan || !jenis_kelamin) {
        return res.status(400).json({
            success: false,
            message: 'NIK, nama, hubungan, dan jenis kelamin harus diisi'
        });
    }

    try {
        await db.query(
            'INSERT INTO family_members (family_id, nik, nama, hubungan, jenis_kelamin, tanggal_lahir) VALUES (?, ?, ?, ?, ?, ?)',
            [id, nik, nama, hubungan, jenis_kelamin, tanggal_lahir || null]
        );

        // Log activity
        if (user_id) {
            await logActivity(user_id, `Menambah anggota keluarga: ${nama} (NIK: ${nik})`);
        }

        res.json({
            success: true,
            message: 'Anggota keluarga berhasil ditambahkan'
        });

    } catch (error) {
        console.error('Add family member error:', error);

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
 * Update family member
 * PUT /api/v1/families/:id/members/:memberId
 */
exports.updateFamilyMember = async (req, res) => {
    const { memberId } = req.params;
    const { nik, nama, hubungan, jenis_kelamin, tanggal_lahir, user_id } = req.body;

    // Validation
    if (!nik || !nama || !hubungan || !jenis_kelamin) {
        return res.status(400).json({
            success: false,
            message: 'NIK, nama, hubungan, dan jenis kelamin harus diisi'
        });
    }

    try {
        const [result] = await db.query(
            'UPDATE family_members SET nik = ?, nama = ?, hubungan = ?, jenis_kelamin = ?, tanggal_lahir = ? WHERE id = ?',
            [nik, nama, hubungan, jenis_kelamin, tanggal_lahir || null, memberId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anggota keluarga tidak ditemukan'
            });
        }

        // Log activity
        if (user_id) {
            await logActivity(user_id, `Mengupdate anggota keluarga: ${nama}`);
        }

        res.json({
            success: true,
            message: 'Anggota keluarga berhasil diperbarui'
        });

    } catch (error) {
        console.error('Update family member error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Delete family member
 * DELETE /api/v1/families/:id/members/:memberId
 */
exports.deleteFamilyMember = async (req, res) => {
    const { memberId } = req.params;
    const { user_id } = req.query;

    try {
        const [result] = await db.query('DELETE FROM family_members WHERE id = ?', [memberId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anggota keluarga tidak ditemukan'
            });
        }

        // Log activity
        if (user_id) {
            await logActivity(user_id, `Menghapus anggota keluarga ID: ${memberId}`);
        }

        res.json({
            success: true,
            message: 'Anggota keluarga berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete family member error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
