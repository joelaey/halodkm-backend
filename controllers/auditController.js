const db = require('../config/db');

/**
 * Helper function to log user activity
 * @param {number} userId - User ID who performed the action
 * @param {string} action - Description of the action
 */
exports.logActivity = async (userId, action) => {
    try {
        await db.query(
            'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
            [userId, action]
        );
    } catch (error) {
        console.error('Audit log error:', error);
        // Don't throw error, just log it
    }
};

/**
 * Get audit logs with optional user filter
 * GET /api/v1/audit
 */
exports.getAuditLogs = async (req, res) => {
    try {
        const { user_id, limit = 100 } = req.query;

        let query = `
            SELECT 
                a.id,
                a.user_id,
                a.action,
                a.created_at,
                u.username,
                u.full_name
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
        `;

        const params = [];

        if (user_id) {
            query += ' WHERE a.user_id = ?';
            params.push(user_id);
        }

        query += ' ORDER BY a.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const [logs] = await db.query(query, params);

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
