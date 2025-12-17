const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const kasController = require('../controllers/kasController');
const jamaahController = require('../controllers/jamaahController');
const infoController = require('../controllers/infoController');
const userController = require('../controllers/userController');
const auditController = require('../controllers/auditController');
const familyController = require('../controllers/familyController');

// Import auth middleware
const { requireAdmin, requireAdminOrJamaah } = require('../middleware/authMiddleware');

// ===== Authentication Routes (Public) =====
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.post('/auth/logout', authController.logout);

// ===== Dashboard Routes (Admin & Jamaah) =====
router.get('/dashboard/stats', requireAdminOrJamaah, dashboardController.getStats);

// ===== Kas Masjid Routes =====
router.get('/kas', requireAdminOrJamaah, kasController.getAllKas);  // Read: Admin & Jamaah
router.post('/kas', requireAdmin, kasController.createKas);          // Create: Admin only
router.put('/kas/:id', requireAdmin, kasController.updateKas);       // Update: Admin only
router.delete('/kas/:id', requireAdmin, kasController.deleteKas);    // Delete: Admin only

// ===== Info Publik Routes =====
router.get('/info', requireAdminOrJamaah, infoController.getAllInfo);  // Read: Admin & Jamaah
router.post('/info', requireAdmin, infoController.createInfo);          // Create: Admin only
router.put('/info/:id', requireAdmin, infoController.updateInfo);       // Update: Admin only
router.delete('/info/:id', requireAdmin, infoController.deleteInfo);    // Delete: Admin only

// ===== Jamaah Routes (Admin Only) =====
router.get('/jamaah', requireAdmin, jamaahController.getAllJamaah);
router.post('/jamaah', requireAdmin, jamaahController.createJamaah);
router.put('/jamaah/:id', requireAdmin, jamaahController.updateJamaah);
router.delete('/jamaah/:id', requireAdmin, jamaahController.deleteJamaah);

// ===== User Management Routes (Admin Only) =====
router.get('/users', requireAdmin, userController.getAllUsers);
router.post('/users', requireAdmin, userController.createUser);
router.put('/users/:id', requireAdmin, userController.updateUser);
router.delete('/users/:id', requireAdmin, userController.deleteUser);

// ===== Audit Logs Routes (Admin Only) =====
router.get('/audit', requireAdmin, auditController.getAuditLogs);

// ===== Family Management Routes (Admin Only) =====
router.get('/families', requireAdmin, familyController.getAllFamilies);
router.get('/families/:id', requireAdmin, familyController.getFamily);
router.get('/families/:id/members', requireAdmin, familyController.getFamilyMembers);
router.post('/families', requireAdmin, familyController.createFamily);
router.put('/families/:id', requireAdmin, familyController.updateFamily);
router.delete('/families/:id', requireAdmin, familyController.deleteFamily);
router.post('/families/:id/members', requireAdmin, familyController.addFamilyMember);
router.put('/families/:id/members/:memberId', requireAdmin, familyController.updateFamilyMember);
router.delete('/families/:id/members/:memberId', requireAdmin, familyController.deleteFamilyMember);

module.exports = router;
