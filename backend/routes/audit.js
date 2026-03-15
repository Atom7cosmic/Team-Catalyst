const express = require('express');
const router = express.Router();
const { auditController } = require('../controllers');
const { authMiddleware, adminMiddleware } = require('../middleware');

router.use(authMiddleware);
router.use(adminMiddleware);

// Audit routes
router.get('/', auditController.getAuditLogs);
router.get('/user/:userId', auditController.getUserAuditLogs);
router.get('/export', auditController.exportAuditLogs);

module.exports = router;
