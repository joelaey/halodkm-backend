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
const pendudukKhususController = require('../controllers/pendudukKhususController');
const eventController = require('../controllers/eventController');

// Import auth middleware
const { requireAdmin, requireAdminOrJamaah } = require('../middleware/authMiddleware');

// ===== Authentication Routes (Public) =====
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.post('/auth/logout', authController.logout);

// Admin Reset Password
router.post('/auth/reset-password', requireAdmin, authController.resetPassword);

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

// ===== Penduduk Khusus Routes (Admin Only) =====
router.get('/penduduk-khusus', requireAdmin, pendudukKhususController.getAllPendudukKhusus);
router.get('/penduduk-khusus/:id', requireAdmin, pendudukKhususController.getPendudukKhusus);
router.post('/penduduk-khusus', requireAdmin, pendudukKhususController.createPendudukKhusus);
router.put('/penduduk-khusus/:id', requireAdmin, pendudukKhususController.updatePendudukKhusus);
router.delete('/penduduk-khusus/:id', requireAdmin, pendudukKhususController.deletePendudukKhusus);

// ===== Event Routes (Admin Only) =====
router.get('/events', requireAdmin, eventController.getAllEvents);
router.get('/events/:id', requireAdmin, eventController.getEvent);
router.post('/events', requireAdmin, eventController.createEvent);
router.put('/events/:id', requireAdmin, eventController.updateEvent);
router.delete('/events/:id', requireAdmin, eventController.deleteEvent);
router.post('/events/:id/complete', requireAdmin, eventController.completeEvent);
router.post('/events/:id/transactions', requireAdmin, eventController.createEventTransaction);
router.put('/events/:id/transactions/:transId', requireAdmin, eventController.updateEventTransaction);
router.delete('/events/:id/transactions/:transId', requireAdmin, eventController.deleteEventTransaction);

// Event Recipients Routes (Admin Only)
router.get('/events/:id/recipients', requireAdmin, eventController.getEventRecipients);
router.post('/events/:id/recipients', requireAdmin, eventController.createEventRecipient);
router.put('/events/:id/recipients/:recipientId', requireAdmin, eventController.updateEventRecipient);
router.delete('/events/:id/recipients/:recipientId', requireAdmin, eventController.deleteEventRecipient);

// Event Panitia Routes (Admin Only)
router.get('/events/:id/panitia', requireAdmin, eventController.getEventPanitia);
router.post('/events/:id/panitia', requireAdmin, eventController.createEventPanitia);
router.put('/events/:id/panitia/:panitiaId', requireAdmin, eventController.updateEventPanitia);
router.delete('/events/:id/panitia/:panitiaId', requireAdmin, eventController.deleteEventPanitia);

// Penduduk Search (for panitia selector)
router.get('/penduduk/search', requireAdmin, eventController.searchPenduduk);

module.exports = router;

