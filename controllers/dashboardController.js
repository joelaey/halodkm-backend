const db = require('../config/db');

/**
 * Get dashboard statistics
 * GET /api/v1/dashboard/stats
 */
exports.getStats = async (req, res) => {
    try {
        const { rt } = req.query;

        // 1. Total Jamaah (from family_members table)
        const [jamaahCount] = await db.query(
            'SELECT COUNT(*) as total FROM family_members'
        );

        // 2. Get current month's date range
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // Format dates for MySQL
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = lastDayOfMonth.toISOString().split('T')[0];

        // 3. Total Pemasukan (bulan ini)
        const [pemasukanData] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM kas_masjid 
             WHERE type = 'masuk' 
             AND tanggal >= ? 
             AND tanggal <= ?`,
            [startDate, endDate]
        );

        // 4. Total Pengeluaran (bulan ini)
        const [pengeluaranData] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM kas_masjid 
             WHERE type = 'keluar' 
             AND tanggal >= ? 
             AND tanggal <= ?`,
            [startDate, endDate]
        );

        // 5. Saldo Kas Masjid (total keseluruhan)
        const [saldoData] = await db.query(
            `SELECT 
                COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0) as saldo
             FROM kas_masjid`
        );

        // 6. Chart: Distribusi Jamaah per RT (from family_members via families)
        let chartQuery;
        let queryParams = [];

        if (rt && rt !== 'All') {
            // If specific RT is selected
            chartQuery = `
                SELECT f.rt as label, COUNT(fm.id)::bigint as value
                FROM family_members fm
                JOIN families f ON fm.family_id = f.id
                WHERE f.rt = ?
                GROUP BY f.rt
                ORDER BY f.rt ASC
            `;
            queryParams = [rt];
        } else {
            // Show all RT distribution
            chartQuery = `
                SELECT f.rt as label, COUNT(fm.id)::bigint as value
                FROM family_members fm
                JOIN families f ON fm.family_id = f.id
                GROUP BY f.rt
                ORDER BY f.rt ASC
            `;
        }

        const [chartData] = await db.query(chartQuery, queryParams);

        // 7. Get list of all RT for filter (from families)
        const [rtList] = await db.query(
            'SELECT DISTINCT rt FROM families ORDER BY rt ASC'
        );

        // Send response
        res.json({
            success: true,
            data: {
                stats: {
                    total_jamaah: jamaahCount[0].total,
                    total_pemasukan: Number(pemasukanData[0].total),
                    total_pengeluaran: Number(pengeluaranData[0].total),
                    saldo_kas: Number(saldoData[0].saldo)
                },
                chart: chartData,
                rt_list: rtList.map(item => item.rt)
            }
        });

    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data dashboard'
        });
    }
};
