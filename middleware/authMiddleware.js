/**
 * Authentication Middleware
 * Provides role-based access control for API endpoints
 */

/**
 * Parse user info from request header
 * In production, this should verify JWT tokens
 */
const parseUserFromHeader = (req) => {
    const userHeader = req.headers['x-user-info'];
    if (!userHeader) return null;

    try {
        return JSON.parse(userHeader);
    } catch (e) {
        return null;
    }
};

/**
 * Middleware to require authentication
 * Attaches user info to req.user
 */
exports.requireAuth = (req, res, next) => {
    const user = parseUserFromHeader(req);

    if (!user || !user.role) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Login diperlukan'
        });
    }

    req.user = user;
    next();
};

/**
 * Middleware to require admin role
 * Must be used after requireAuth
 */
exports.requireAdmin = (req, res, next) => {
    const user = parseUserFromHeader(req);

    if (!user || user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: Akses khusus admin'
        });
    }

    req.user = user;
    next();
};

/**
 * Middleware to allow both admin and jamaah roles
 * Used for read-only endpoints
 */
exports.requireAdminOrJamaah = (req, res, next) => {
    const user = parseUserFromHeader(req);

    if (!user || (user.role !== 'admin' && user.role !== 'jamaah')) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: Akses tidak diizinkan'
        });
    }

    req.user = user;
    next();
};
